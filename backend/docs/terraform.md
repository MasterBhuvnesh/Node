# Terraform Infrastructure Guide

Terraform provisions all the AWS infrastructure needed to run the backend in production. You run it **once** at the start of the project to set up everything, then rarely touch it again.

---

## When do you run Terraform?

| Scenario | Run Terraform? |
|----------|---------------|
| First time setting up production | Yes — `terraform apply` |
| Deploying a new code version | No — use `kubectl set image` |
| Changing environment variables | No — use `kubectl create secret` |
| Scaling pods (2 → 5) | No — HPA handles it automatically |
| Adding a new subdomain | Yes — add to `route53.tf` |
| Upgrading Kubernetes version | Yes — change `cluster_version` |
| Changing DB instance size | Yes — change `db_instance_class` |
| Adding a new AWS service | Yes — add new `.tf` file |

**Rule of thumb:** Terraform manages AWS resources (the "where"). Kubernetes manifests manage your app (the "what runs").

---

## What Terraform creates

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Account                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    VPC (10.0.0.0/16)                     │    │
│  │                                                          │    │
│  │  ┌──────────────┐         ┌──────────────────────────┐  │    │
│  │  │Public Subnets│         │    Private Subnets        │  │    │
│  │  │  (2x AZs)   │         │      (2x AZs)            │  │    │
│  │  │             │         │                           │  │    │
│  │  │  Internet   │   NAT   │  ┌─────┐    ┌─────────┐  │  │    │
│  │  │  Gateway    │───────▶ │  │ EKS │    │   RDS   │  │  │    │
│  │  │             │         │  │Nodes│    │PostgreSQL│  │  │    │
│  │  └──────────────┘         │  └─────┘    └─────────┘  │  │    │
│  │                           └──────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────────────┐    │
│  │    EKS     │  │     ACM     │  │   Secrets Manager     │    │
│  │  Cluster   │  │ SSL Certs   │  │  JWT, SMTP creds      │    │
│  │  + Addons  │  │ (auto DNS)  │  │                       │    │
│  └────────────┘  └─────────────┘  └───────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────┐                             │
│  │          Route 53              │                             │
│  │  node.gdgrbu.dev → Backend LB  │                             │
│  │  dashboard.gdgrbu.dev → Grafana │                             │
│  └────────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## File structure

```
infra/
├── main.tf                    # Provider config (AWS, region, state backend)
├── variables.tf               # All input variables with defaults
├── vpc.tf                     # VPC, subnets, IGW, NAT, route tables
├── iam.tf                     # IAM roles for EKS cluster and nodes
├── eks.tf                     # EKS cluster, node group, addons
├── rds.tf                     # Managed PostgreSQL database
├── route53.tf                 # ACM certificates + DNS validation records
├── secrets.tf                 # AWS Secrets Manager entries
├── outputs.tf                 # Useful outputs (endpoints, ARNs)
├── terraform.tfvars.example   # Example config (copy to terraform.tfvars)
└── .gitignore                 # Ignores state files and real .tfvars
```

---

## First time setup

### Prerequisites

```bash
# Install Terraform
choco install terraform    # Windows
brew install terraform     # macOS

# AWS CLI configured
aws configure
```

### Steps

```bash
cd backend/infra

# 1. Create your config
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your real values:

```hcl
region             = "ap-south-1"
cluster_name       = "node-app-cluster"
cluster_version    = "1.34"
node_instance_type = "t3.small"
node_desired_count = 2

db_name     = "node_db"
db_username = "node_user"
db_password = "a-strong-password-here"

domain_name         = "gdgrbu.dev"
api_subdomain       = "node"
dashboard_subdomain = "dashboard"
```

```bash
# 2. Initialize Terraform (downloads providers)
terraform init

# 3. Preview what will be created
terraform plan

# 4. Create everything (~15-20 min)
terraform apply
```

Type `yes` when prompted.

### After Terraform finishes

```bash
# 5. Configure kubectl to talk to the new cluster
aws eks update-kubeconfig --name node-app-cluster --region ap-south-1

# 6. Verify
kubectl get nodes

# 7. Deploy your app
bash k8s/deploy.sh

# 8. Get the RDS database URL
terraform output -raw database_url

# 9. Update backend secrets to use RDS instead of in-cluster postgres
kubectl delete secret backend-secrets -n node-app
kubectl create secret generic backend-secrets -n node-app \
  --from-literal=DATABASE_URL="$(terraform output -raw database_url)" \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=JWT_REFRESH_SECRET="your-refresh-secret" \
  --from-literal=SMTP_HOST="smtp.gmail.com" \
  --from-literal=SMTP_USER="your-email@gmail.com" \
  --from-literal=SMTP_PASSWORD="your-app-password" \
  --from-literal=EMAIL_FROM="Notification Service <your-email@gmail.com>"

# 10. Restart backend to pick up new secrets
kubectl rollout restart deploy/backend -n node-app

# 11. Push schema to RDS
kubectl exec -it deploy/backend -n node-app -- bunx prisma db push
```

---

## Outputs

After `terraform apply`, you can query outputs:

```bash
terraform output cluster_name
terraform output cluster_endpoint
terraform output database_endpoint
terraform output database_url
terraform output api_certificate_arn
terraform output dashboard_certificate_arn
terraform output configure_kubectl
```

---

## When to run Terraform again

Almost never for day-to-day work. Only when you need to change infrastructure:

```bash
# After editing a .tf file:
terraform plan     # preview changes
terraform apply    # apply changes
```

Examples:
- Upgrade K8s version: change `cluster_version` in `terraform.tfvars`
- Scale DB: change `db_instance_class` to `db.t3.small`
- Add new subdomain: add a new `aws_acm_certificate` in `route53.tf`

---

## Terraform vs kubectl — who does what?

```
                    ┌──────────────────────────────────┐
                    │        terraform apply            │
                    │     (run once at project start)   │
                    └──────────────┬───────────────────┘
                                   │ creates
                                   ▼
              ┌─────────────────────────────────────────┐
              │  AWS: VPC, EKS, RDS, ACM, Secrets, IAM  │
              └─────────────────────────────────────────┘
                                   │
                                   │ then
                                   ▼
                    ┌──────────────────────────────────┐
                    │      bash k8s/deploy.sh           │
                    │   (run once after infra is up)    │
                    └──────────────┬───────────────────┘
                                   │ creates
                                   ▼
              ┌─────────────────────────────────────────┐
              │  K8s: pods, services, HPA, configmaps   │
              └─────────────────────────────────────────┘
                                   │
                                   │ then daily workflow
                                   ▼
                    ┌──────────────────────────────────┐
                    │   kubectl set image / rollout     │
                    │   (every time you deploy code)    │
                    └──────────────────────────────────┘
```

---

## Destroy everything

```bash
# WARNING: This deletes ALL infrastructure including the database
terraform destroy
```

This removes: EKS cluster, nodes, RDS database, VPC, certificates — everything.

---

## Cost estimate (production)

| Resource | Monthly cost |
|----------|-------------|
| EKS control plane | ~$73 |
| 2x t3.small nodes | ~$30 |
| RDS db.t3.micro | ~$15 |
| NAT Gateway | ~$32 |
| 3x Load Balancers | ~$54 |
| EBS storage (5Gi) | ~$0.50 |
| Route 53 hosted zone | ~$0.50 |
| ACM certificates | Free |
| Secrets Manager | ~$1 |
| **Total** | **~$206/month** |

To reduce cost for testing:
- Use 1 node instead of 2
- Skip NAT gateway (put nodes in public subnets)
- Use `db.t3.micro` with single-AZ
