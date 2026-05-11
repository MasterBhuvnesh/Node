# AWS EKS Manual Setup & Troubleshooting Guide

This document covers how we manually set up the Node.js backend on AWS EKS using CLI commands, including every error we faced and how we resolved it.

---

## Overview

```
GitHub (push tag) → GitHub Actions → Docker Hub → EKS (kubectl set image)

AWS Infrastructure:
- EKS Cluster (node-app-cluster) in ap-south-1
- 2x t3.small nodes (managed node group)
- Classic Load Balancers (auto-provisioned by K8s services)
- Route 53 DNS (node.gdgrbu.dev → backend, dashboard.gdgrbu.dev → grafana)
- ACM SSL certificates (auto-validated via Route 53)
- EBS volumes (gp2) for PostgreSQL persistence
```

---

## Step-by-Step Setup

### 1. Create the EKS Cluster

```bash
eksctl create cluster \
  --name node-app-cluster \
  --region ap-south-1 \
  --nodes 2 \
  --node-type t3.small \
  --managed
```

This takes ~15 minutes. It automatically:

- Creates a VPC with public/private subnets
- Creates the EKS control plane
- Creates a managed node group with 2 nodes
- Configures your local `kubectl` context

Verify:

```bash
kubectl get nodes
# NAME                                             STATUS   ROLES    AGE
# ip-192-168-19-89.ap-south-1.compute.internal     Ready    <none>   5m
# ip-192-168-73-187.ap-south-1.compute.internal    Ready    <none>   5m
```

---

### 2. Install the EBS CSI Driver

EKS does NOT include the EBS CSI driver by default. Without it, any PersistentVolumeClaim using `gp2` storage will be stuck in `Pending` forever.

```bash
# Get your nodegroup name
aws eks list-nodegroups --cluster-name node-app-cluster --region ap-south-1

# Get the node IAM role ARN
aws eks describe-nodegroup \
  --cluster-name node-app-cluster \
  --nodegroup-name <YOUR_NODEGROUP_NAME> \
  --region ap-south-1 \
  --query "nodegroup.nodeRole" --output text
# Example output: arn:aws:iam::381491923704:role/eksctl-node-app-cluster-nodegro-NodeInstanceRole-XXXX

# Attach EBS policy to the node role (use just the role NAME, not the full ARN)
aws iam attach-role-policy \
  --role-name eksctl-node-app-cluster-nodegro-NodeInstanceRole-XXXX \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy

# Install the EBS CSI addon
eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster node-app-cluster \
  --region ap-south-1 \
  --force
```

---

### 3. Deploy All K8s Manifests

```bash
bash k8s/deploy.sh
```

This applies all manifests: namespace, postgres, monitoring stack, backend deployment, services, HPA.

---

### 4. Configure Secrets

The default secret values are placeholders. Replace them with real ones:

```bash
kubectl delete secret backend-secrets -n node-app

kubectl create secret generic backend-secrets -n node-app \
  --from-literal=DATABASE_URL="postgresql://node_user:node_pass@postgres-svc:5432/node_db" \
  --from-literal=JWT_SECRET="your-real-jwt-secret" \
  --from-literal=JWT_REFRESH_SECRET="your-real-refresh-secret" \
  --from-literal=SMTP_HOST="smtp.gmail.com" \
  --from-literal=SMTP_USER="your-email@gmail.com" \
  --from-literal=SMTP_PASSWORD="your-app-password" \
  --from-literal=EMAIL_FROM="Notification Service <your-email@gmail.com>"

kubectl rollout restart deploy/backend -n node-app
```

---

### 5. Push Prisma Schema to Database

```bash
kubectl exec -it deploy/backend -n node-app -- bunx prisma db push
```

---

### 6. Set Up Route 53 Custom Domains

#### Get the Load Balancer DNS names

```bash
kubectl get svc -n node-app
# backend-svc   LoadBalancer   aeb4a08d-xxxxx.ap-south-1.elb.amazonaws.com
# grafana-svc   LoadBalancer   a16edf5a-xxxxx.ap-south-1.elb.amazonaws.com
```

#### Create DNS records in Route 53

1. Go to Route 53 → Hosted Zones → `gdgrbu.dev`
2. Create record:
   - Name: `node.gdgrbu.dev`
   - Type: A (Alias)
   - Route traffic to: Classic Load Balancer → ap-south-1 → select backend LB
3. Create record:
   - Name: `dashboard.gdgrbu.dev`
   - Type: A (Alias)
   - Route traffic to: Classic Load Balancer → ap-south-1 → select grafana LB

#### Request ACM SSL Certificates

```bash
# Request cert for node.gdgrbu.dev
aws acm request-certificate \
  --domain-name node.gdgrbu.dev \
  --validation-method DNS \
  --region ap-south-1

# Request cert for dashboard.gdgrbu.dev
aws acm request-certificate \
  --domain-name dashboard.gdgrbu.dev \
  --validation-method DNS \
  --region ap-south-1
```

Then in ACM console → click the cert → "Create records in Route 53" to auto-validate.

#### Add SSL annotations to services

Backend service (`k8s/backend/service.yml`):

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:ap-south-1:381491923704:certificate/eac16612-65cc-46a8-86f3-13ce79c4dcd4"
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "http"
spec:
  type: LoadBalancer
  ports:
    - name: https
      port: 443
      targetPort: 3000
    - name: http
      port: 80
      targetPort: 3000
```

Grafana service (`k8s/monitoring/grafana/service.yml`):

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:ap-south-1:381491923704:certificate/2cd4640d-5f1d-4144-8711-8d170c4f5cee"
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "http"
spec:
  type: LoadBalancer
  ports:
    - name: https
      port: 443
      targetPort: 3000
    - name: http
      port: 80
      targetPort: 3000
```

Apply changes:

```bash
kubectl apply -f k8s/backend/service.yml
kubectl apply -f k8s/monitoring/grafana/service.yml
```

After applying, the LB DNS might change. Update Route 53 A records if needed.

---

### 7. Set Up CI/CD IAM User for GitHub Actions

Create an IAM user that GitHub Actions uses to deploy:

```bash
# Create IAM user
aws iam create-user --user-name node-githubaction

# Create access key (save these as GitHub secrets)
aws iam create-access-key --user-name node-githubaction

# Attach EKS policy so the user can describe/update clusters
aws iam attach-user-policy \
  --user-name node-githubaction \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
```

#### Grant the IAM user access to the K8s cluster (aws-auth ConfigMap)

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::381491923704:role/eksctl-node-app-cluster-nodegro-NodeInstanceRole-XXXX
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
  mapUsers: |
    - userarn: arn:aws:iam::381491923704:user/node-githubaction
      username: node-githubaction
      groups:
        - system:masters
EOF
```

#### GitHub Secrets needed

| Secret                  | Value                                   |
| ----------------------- | --------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | From `aws iam create-access-key` output |
| `AWS_SECRET_ACCESS_KEY` | From `aws iam create-access-key` output |
| `DOCKER_USERNAME`       | Docker Hub username (e.g., `verma2904`) |
| `DOCKER_PASSWORD`       | Docker Hub access token                 |

---

### 8. Trigger a Deployment

```bash
# Bump version and push tag
bun run release
# This creates tag backend-v1.0.X and pushes it

# GitHub Actions automatically: test → build → push → deploy to EKS
```

---

## Errors We Faced & How We Fixed Them

### Error 1: PVC Stuck in Pending

**Symptom:**

```
kubectl get pvc -n node-app
# postgres-pvc   Pending   ...
```

**Cause:** EBS CSI driver not installed. EKS doesn't include it by default, so the cluster can't provision EBS volumes for PVCs with `storageClassName: gp2`.

**Fix:**

1. Attach `AmazonEBSCSIDriverPolicy` to the node IAM role
2. Install the `aws-ebs-csi-driver` addon (see Step 2 above)

---

### Error 2: PostgreSQL CrashLoopBackOff

**Symptom:**

```
kubectl logs postgres-xxx -n node-app
# initdb: error: directory "/var/lib/postgresql/data" exists but is not empty
# It contains a lost+found directory, perhaps due to it being a mount point.
```

**Cause:** AWS EBS volumes have a `lost+found` directory at the filesystem root. PostgreSQL's `initdb` refuses to initialize in a non-empty directory.

**Fix:** Add `subPath: pgdata` to the volume mount in `k8s/postgres/deployment.yml`:

```yaml
volumeMounts:
  - name: postgres-data
    mountPath: /var/lib/postgresql/data
    subPath: pgdata # ← this puts data inside a subdirectory, avoiding lost+found
```

---

### Error 3: Prisma P1001 — Can't reach database server

**Symptom:**

```
Error: P1001: Can't reach database server at `localhost:5432`
```

**Cause:** The backend pod was using `localhost` as the database host. In Kubernetes, each pod has its own network namespace — `localhost` refers to the pod itself, not other pods.

**Fix:** Use the Kubernetes Service DNS name in `DATABASE_URL`:

```
postgresql://node_user:node_pass@postgres-svc.node-app.svc.cluster.local:5432/node_db
# Short form (within same namespace):
postgresql://node_user:node_pass@postgres-svc:5432/node_db
```

---

### Error 4: IAM AccessDeniedException for GitHub Actions

**Symptom:**

```
Error: aws: [ERROR] An error occurred (AccessDeniedException) when calling the DescribeCluster operation
```

**Cause:** The IAM user `node-githubaction` didn't have permissions to interact with EKS, AND wasn't mapped to a K8s RBAC group in the `aws-auth` ConfigMap.

**Fix (two parts):**

1. Attach the EKS policy to the IAM user:

```bash
aws iam attach-user-policy \
  --user-name node-githubaction \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
```

2. Add the user to `aws-auth` ConfigMap with `system:masters` group (see Step 7 above).

---

### Error 5: aws-auth ConfigMap YAML Formatting Broken

**Symptom:** After running `kubectl edit configmap aws-auth -n kube-system`, the YAML got corrupted because the editor wrapped long lines.

**Cause:** Using `kubectl edit` in a terminal editor that auto-wraps lines breaks YAML multi-line strings.

**Fix:** Never use `kubectl edit` for `aws-auth`. Instead, apply from a heredoc or file:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::381491923704:role/YOUR_ROLE
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
  mapUsers: |
    - userarn: arn:aws:iam::381491923704:user/node-githubaction
      username: node-githubaction
      groups:
        - system:masters
EOF
```

---

### Error 6: GitHub Actions Deploy Timeout (120s)

**Symptom:**

```
Waiting for deployment "backend" rollout to finish: 3 out of 4 new replicas have been updated...
error: timed out waiting for the condition
```

**Cause:** With 4 replicas and `maxSurge: 1, maxUnavailable: 0`, rolling updates take time (create 1 new pod → wait for ready → kill 1 old pod → repeat). 120s wasn't enough.

**Fix:** Increased timeout to 600s in `.github/workflows/backend.yml`:

```yaml
kubectl rollout status deploy/backend -n node-app --timeout=600s
```

---

### Error 7: New Pod Stuck in Pending During Rolling Update

**Symptom:**

```
NAME                       READY   STATUS    NODE
backend-5f8b56df77-d5nrs   0/1     Pending   <none>
```

The deployment shows "1 out of 5 new replicas have been updated" and never progresses.

**Cause:** With `maxSurge: 1, maxUnavailable: 0`, Kubernetes needs to create an extra pod (N+1) before killing any old ones. But the 2x t3.small nodes were already at capacity — no room for the extra pod.

**Fix:** Changed the rolling update strategy in `k8s/backend/deployment.yml`:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1 # kill 1 old pod first to free resources
    maxSurge: 0 # don't need extra capacity during updates
```

This means during updates: kill 1 old pod → create 1 new pod in the freed space → repeat. With 4-5 replicas behind a LoadBalancer, losing 1 pod briefly is unnoticeable to users.

---

### Error 8: Grafana Dashboard Shows "No Data"

**Symptom:** Grafana was running but all dashboard panels showed "No data".

**Cause:** The dashboard JSON file wasn't mounted into the Grafana container. Grafana had no provisioned dashboards.

**Fix:** Created a ConfigMap from the dashboard JSON and mounted it:

```yaml
# In grafana deployment.yml
volumeMounts:
  - name: dashboards
    mountPath: /var/lib/grafana/dashboards
volumes:
  - name: dashboards
    configMap:
      name: grafana-dashboards
```

Also had to fix the Prometheus datasource UID in the dashboard JSON — changed hardcoded UID to `${DS_PROMETHEUS}` template variable.

---

### Error 9: Grafana Not Accessible After Route 53 Setup

**Symptom:** `dashboard.gdgrbu.dev` wasn't loading even though the cert was validated and DNS record existed.

**Cause:** The `GF_SERVER_ROOT_URL` env var wasn't set, and Grafana was serving on the wrong path/protocol assumption.

**Fix:** Added env vars to the Grafana deployment:

```yaml
env:
  - name: GF_SERVER_ROOT_URL
    value: "https://dashboard.gdgrbu.dev"
  - name: GF_SERVER_SERVE_FROM_SUB_PATH
    value: "false"
```

---

## Useful Commands Reference

```bash
# Check all pods
kubectl get pods -n node-app -o wide

# Check services and external IPs
kubectl get svc -n node-app

# Check HPA (autoscaling status)
kubectl get hpa -n node-app

# Tail backend logs
kubectl logs -f -l app=backend -n node-app

# Check what image a deployment is running
kubectl describe deploy/backend -n node-app | grep Image

# Manually trigger a rolling update
kubectl set image deploy/backend backend=verma2904/node-backend:1.0.12 -n node-app

# Watch rollout progress
kubectl rollout status deploy/backend -n node-app

# Rollback if something is broken
kubectl rollout undo deploy/backend -n node-app

# Check node resource usage
kubectl top nodes
kubectl top pods -n node-app

# Shell into a pod
kubectl exec -it deploy/backend -n node-app -- sh

# Check the aws-auth ConfigMap
kubectl get configmap aws-auth -n kube-system -o yaml

# Delete everything and start over
eksctl delete cluster --name node-app-cluster --region ap-south-1
```

---

## Architecture Diagram

```
                         ┌─────────────────────────┐
                         │      Route 53 DNS       │
                         │  node.gdgrbu.dev        │
                         │  dashboard.gdgrbu.dev   │
                         └────────┬────────────────┘
                                  │ A record (alias)
                                  ▼
                    ┌───────────────────────────────┐
                    │   AWS Classic Load Balancers  │
                    │   (with ACM SSL termination)  │
                    └──────┬───────────────┬────────┘
                           │               │
              port 443     │               │    port 443
                           ▼               ▼
                    ┌─────────────┐  ┌───────────┐
                    │  Backend    │  │  Grafana  │
                    │  (2-10 pods)│  │  (1 pod)  │
                    │  HPA scaled │  └─────┬─────┘
                    └──────┬──────┘        │
                           │               ▼
                           │         ┌───────────┐
                           ▼         │   Loki    │
                    ┌─────────────┐  │ Prometheus│
                    │  PostgreSQL │  └───────────┘
                    │  (EBS gp2)  │
                    └─────────────┘

    Nodes: 2x t3.small (ap-south-1)
    Cluster: node-app-cluster
    Namespace: node-app
```

---

## Cost Breakdown

| Resource                  | Monthly Cost    |
| ------------------------- | --------------- |
| EKS control plane         | ~$73            |
| 2x t3.small nodes         | ~$30            |
| 3x Classic Load Balancers | ~$54            |
| 5Gi EBS volume (gp2)      | ~$0.50          |
| Route 53 hosted zone      | ~$0.50          |
| ACM certificates          | Free            |
| **Total**                 | **~$158/month** |

---

## Key Lessons Learned

1. **EBS CSI driver is not pre-installed on EKS** — always install it before deploying stateful workloads
2. **EBS volumes have `lost+found`** — always use `subPath` when mounting for PostgreSQL
3. **K8s pods don't share localhost** — use Service DNS names (`service-name.namespace.svc.cluster.local`)
4. **aws-auth is fragile** — never `kubectl edit` it, always `kubectl apply -f`
5. **Rolling updates need spare capacity** — on tight nodes, use `maxUnavailable: 1` instead of `maxSurge: 1`
6. **IAM ≠ K8s RBAC** — IAM grants AWS API access, but you ALSO need aws-auth mapping for kubectl access
7. **ACM certs are free and auto-renew** — use DNS validation via Route 53 for zero-touch SSL
