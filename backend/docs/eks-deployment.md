# EKS Deployment Guide

Deploy the backend to a new AWS EKS cluster from scratch.

**Time:** ~20 minutes from zero to live API.

---

## Prerequisites

```bash
# AWS CLI configured with your credentials
aws configure

# Install eksctl and kubectl
choco install eksctl    # Windows
choco install kubectl   # Windows
# or
brew install eksctl     # macOS
brew install kubectl    # macOS
```

---

## Step 1: Create the EKS cluster (~15 min)

```bash
eksctl create cluster \
  --name node-app-cluster \
  --region ap-south-1 \
  --nodes 2 \
  --node-type t3.small \
  --managed
```

This automatically configures `kubectl` to point at the new cluster.

Verify:

```bash
kubectl get nodes
# Should show 2 nodes in "Ready" state
```

---

## Step 2: Install EBS CSI driver

EKS does not include the EBS CSI driver by default. Without it, PostgreSQL's PersistentVolumeClaim cannot provision an EBS volume.

```bash
# 1. Get your nodegroup name
aws eks list-nodegroups --cluster-name node-app-cluster --region ap-south-1
```

```bash
# 2. Get the node IAM role (copy the part after the last /)
aws eks describe-nodegroup \
  --cluster-name node-app-cluster \
  --nodegroup-name YOUR_NODEGROUP_NAME \
  --region ap-south-1 \
  --query "nodegroup.nodeRole" --output text
```

```bash
# 3. Attach the EBS policy to the node role
aws iam attach-role-policy \
  --role-name YOUR_ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy
```

```bash
# 4. Install the EBS CSI addon
eksctl create addon --name aws-ebs-csi-driver --cluster node-app-cluster --region ap-south-1 --force
```

---

## Step 3: Deploy everything

```bash
bash k8s/deploy.sh
```

This creates:
- Namespace `node-app`
- PostgreSQL with persistent EBS volume (5Gi, gp2)
- Monitoring stack (Prometheus, Loki, Grafana with pre-loaded dashboard)
- Backend (2 replicas with HPA autoscaling 2-10 pods)

---

## Step 4: Wait for PostgreSQL

```bash
kubectl wait --namespace node-app --for=condition=ready pod -l app=postgres --timeout=120s
```

If this times out, check the PVC:

```bash
kubectl get pvc -n node-app
kubectl describe pvc postgres-pvc -n node-app
```

Common issue: EBS CSI driver not yet ready. Wait a minute and retry.

---

## Step 5: Update secrets with real values

The default secrets in `k8s/backend/secret.yml` are placeholders. Replace them:

```bash
kubectl delete secret backend-secrets -n node-app

kubectl create secret generic backend-secrets -n node-app \
  --from-literal=DATABASE_URL="postgresql://node_user:node_pass@postgres-svc:5432/node_db" \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=JWT_REFRESH_SECRET="your-refresh-secret" \
  --from-literal=SMTP_HOST="smtp.gmail.com" \
  --from-literal=SMTP_USER="your-email@gmail.com" \
  --from-literal=SMTP_PASSWORD="your-app-password" \
  --from-literal=EMAIL_FROM="Notification Service <your-email@gmail.com>"

kubectl rollout restart deploy/backend -n node-app
```

Wait for the backend to come back up:

```bash
kubectl wait --namespace node-app --for=condition=ready pod -l app=backend --timeout=120s
```

---

## Step 6: Push Prisma schema

```bash
kubectl exec -it deploy/backend -n node-app -- bunx prisma db push
```

---

## Step 7: Get your public URLs

```bash
kubectl get svc -n node-app
```

The `EXTERNAL-IP` column shows your AWS Load Balancer DNS names (takes 2-3 minutes to provision).

Each LoadBalancer service gets its **own unique DNS/IP**, even if they use the same port:

```
NAME             TYPE           EXTERNAL-IP                                                          PORT(S)
backend-svc      LoadBalancer   aeb4a08d-xxxxx.ap-south-1.elb.amazonaws.com                         3000:30080/TCP
grafana-svc      LoadBalancer   a16edf5a-xxxxx.ap-south-1.elb.amazonaws.com                         3000:30030/TCP
prometheus-svc   LoadBalancer   a0269a8c-xxxxx.ap-south-1.elb.amazonaws.com                         9090:30090/TCP
```

| Service        | URL                                          | Credentials |
|----------------|----------------------------------------------|-------------|
| Backend API    | `http://BACKEND_EXTERNAL_IP:3000`            | -           |
| Grafana        | `http://GRAFANA_EXTERNAL_IP:3000`            | admin/admin |
| Prometheus     | `http://PROMETHEUS_EXTERNAL_IP:9090`         | -           |

> Both backend and Grafana run on port 3000, but each has its own Load Balancer with a different DNS name — no conflict.

---

## Step 8: Verify

```bash
curl http://YOUR_BACKEND_EXTERNAL_IP:3000/health
# {"status":"ok"}
```

---

## Deploying a new version

When a new Docker image is published (via CI or manually), trigger a rolling update on EKS:

### Option A: Deploy a specific version tag

```bash
# After CI pushes verma2904/node-backend:v1.0.10
kubectl set image deploy/backend backend=verma2904/node-backend:v1.0.10 -n node-app

# Watch the rollout (zero downtime)
kubectl rollout status deploy/backend -n node-app
```

### Option B: Re-pull the `latest` tag

If the image tag hasn't changed (e.g., you pushed a new `:latest`):

```bash
# Force a re-pull by restarting the deployment
kubectl rollout restart deploy/backend -n node-app

# Watch it
kubectl rollout status deploy/backend -n node-app
```

### Option C: Full release flow (recommended)

```bash
# 1. Bump version locally
bun run release    # creates backend-v1.0.10 tag

# 2. Push tag — triggers GitHub Actions CI
git push origin HEAD --tags

# 3. CI runs tests → builds image → pushes to Docker Hub
#    (verma2904/node-backend:latest + verma2904/node-backend:1.0.10)

# 4. Once CI is done, deploy to EKS
kubectl set image deploy/backend backend=verma2904/node-backend:1.0.10 -n node-app
kubectl rollout status deploy/backend -n node-app
```

### Rollback if something goes wrong

```bash
# Undo the last deployment
kubectl rollout undo deploy/backend -n node-app

# Or roll back to a specific revision
kubectl rollout history deploy/backend -n node-app
kubectl rollout undo deploy/backend -n node-app --to-revision=2
```

### Verify the deployed version

```bash
kubectl describe deploy/backend -n node-app | grep Image
# Image: verma2904/node-backend:v1.0.10
```

---

## Connecting a custom domain (Route 53)

1. Go to Route 53 → Hosted Zones → your domain
2. Create an **A record** (Alias) pointing to the backend LoadBalancer
3. Request a free SSL cert via ACM
4. Add the ACM annotation to `k8s/backend/service.yml`:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:REGION:ACCOUNT:certificate/CERT_ID"
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "https"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "http"
```

---

## Useful commands

```bash
# All pods
kubectl get pods -n node-app

# All services with external IPs
kubectl get svc -n node-app

# Tail backend logs
kubectl logs -f -l app=backend -n node-app

# Check autoscaler
kubectl get hpa -n node-app

# Resource usage
kubectl top pods -n node-app

# Shell into a backend pod
kubectl exec -it deploy/backend -n node-app -- sh
```

---

## Tear down (to avoid charges)

```bash
eksctl delete cluster --name node-app-cluster --region ap-south-1
```

This deletes everything: cluster, nodes, load balancers, EBS volumes.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| PVC stuck in `Pending` | EBS CSI driver not installed | Run Step 2 |
| Postgres `CrashLoopBackOff` | `lost+found` on EBS root | Fixed in code (`subPath: pgdata`) |
| `Can't reach database` | Postgres pod not ready | Wait for pod, check logs |
| Services have no EXTERNAL-IP | LoadBalancer provisioning | Wait 2-3 min |
| Grafana shows "No data" | Dashboard not provisioned | Already fixed with ConfigMap mount |

---

## Architecture on EKS

```
Internet
    │
    ▼
┌─────────────────────────────────────────────┐
│  AWS Load Balancers                         │
│  (auto-provisioned per LoadBalancer svc)    │
└──────┬──────────────┬──────────────┬────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────┐   ┌───────────┐   ┌──────────┐
│ Backend  │   │  Grafana  │   │Prometheus│
│ (2+ pods)│   │  (1 pod)  │   │ (1 pod)  │
└────┬─────┘   └─────┬─────┘   └────┬─────┘
     │               │              │
     ▼               ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│PostgreSQL│   │   Loki   │   │ Backend  │
│ (1 pod)  │   │ (1 pod)  │   │ /metrics │
│ EBS vol  │   └──────────┘   └──────────┘
└──────────┘
```

---

## Cost estimate

| Resource | Monthly cost |
|----------|-------------|
| EKS control plane | ~$73 |
| 2x t3.small nodes | ~$30 |
| 3x LoadBalancer | ~$54 |
| 5Gi EBS volume | ~$0.50 |
| **Total** | **~$158/month** |

For testing: spin up, verify, tear down. A few hours costs under $1.
