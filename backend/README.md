# Node Backend

REST API for group management with authentication, role-based access control, and full observability stack.

Built with **Bun**, **Express 5**, **Prisma**, and **PostgreSQL**.

## Tech Stack

| Layer         | Technology                            |
|---------------|---------------------------------------|
| Runtime       | Bun                                   |
| Framework     | Express 5                             |
| Database      | PostgreSQL 16 + Prisma ORM            |
| Auth          | JWT (access + refresh tokens), OTP    |
| Validation    | Zod                                   |
| Email         | Nodemailer (SMTP)                     |
| Monitoring    | Prometheus + Grafana + Loki           |
| Logging       | Winston + winston-loki                |
| Security      | Helmet, CORS, bcrypt, rate limiting   |
| Testing       | Vitest + Supertest                    |
| Container     | Docker (multi-stage), Kubernetes      |

## Features

- Email verification and password reset via OTP
- Access + refresh token authentication
- Group management with OWNER / LEADER / MEMBER roles
- Role-based permission enforcement
- Activity audit logs per group (cursor-paginated)
- Prometheus metrics endpoint (`/metrics`)
- Structured logging shipped to Loki
- Horizontal Pod Autoscaler (2-10 replicas)
- Graceful shutdown with connection draining

## Quick Start

```bash
# Install dependencies
bun install

# Start PostgreSQL
docker compose up -d

# Push schema and generate client
bun run db:push
bun run db:generate

# Start dev server (hot reload)
bun run dev
```

API available at `http://localhost:3000`

## API Endpoints

### Auth (public)

| Method | Endpoint               | Body                           |
|--------|------------------------|--------------------------------|
| POST   | `/auth/signup`         | `{ name, email, password }`    |
| POST   | `/auth/login`          | `{ email, password }`          |
| POST   | `/auth/verify-otp`     | `{ email, code }`              |
| POST   | `/auth/refresh-token`  | `{ refreshToken }`             |
| POST   | `/auth/forgot-password`| `{ email }`                    |
| POST   | `/auth/reset-password` | `{ email, code, newPassword }` |
| POST   | `/auth/logout`         | `{ refreshToken }`             |

### Users (authenticated)

| Method | Endpoint    | Body       |
|--------|-------------|------------|
| GET    | `/users/me` | -          |
| PUT    | `/users/me` | `{ name }` |

### Groups (authenticated)

| Method | Endpoint      | Body       | Permission   |
|--------|---------------|------------|--------------|
| GET    | `/groups`     | -          | Any member   |
| POST   | `/groups`     | `{ name }` | Any user     |
| GET    | `/groups/:id` | -          | Group member |
| PUT    | `/groups/:id` | `{ name }` | Owner/Leader |
| DELETE | `/groups/:id` | -          | Owner only   |

### Members (authenticated)

| Method | Endpoint                           | Body         | Permission   |
|--------|------------------------------------|--------------|--------------|
| POST   | `/groups/:id/members`              | `{ email }`  | Owner/Leader |
| DELETE | `/groups/:id/members/:userId`      | -            | Owner/Leader |
| PUT    | `/groups/:id/members/:userId/role` | `{ role }`   | Owner only   |

### Logs (authenticated)

| Method | Endpoint           | Query Params         | Permission   |
|--------|--------------------|----------------------|--------------|
| GET    | `/groups/:id/logs` | `?cursor=X&take=20`  | Group member |

### Health / Metrics

| Method | Endpoint   | Description          |
|--------|------------|----------------------|
| GET    | `/health`  | Health check         |
| GET    | `/metrics` | Prometheus metrics   |

## Environment Variables

| Variable             | Required | Default         | Description                |
|----------------------|----------|-----------------|----------------------------|
| `DATABASE_URL`       | Yes      | -               | PostgreSQL connection URL   |
| `JWT_SECRET`         | Yes      | -               | Access token signing key   |
| `JWT_REFRESH_SECRET` | Yes      | -               | Refresh token signing key  |
| `SMTP_HOST`          | Yes      | `smtp.gmail.com`| SMTP server host           |
| `SMTP_PORT`          | No       | `587`           | SMTP server port           |
| `SMTP_USER`          | Yes      | -               | SMTP sender email          |
| `SMTP_PASSWORD`      | Yes      | -               | SMTP app password          |
| `EMAIL_FROM`         | Yes      | -               | Email "From" field         |
| `PORT`               | No       | `3000`          | Server port                |
| `NODE_ENV`           | No       | `development`   | Environment mode           |
| `LOKI_URL`           | No       | -               | Loki push endpoint         |

## Scripts

```bash
bun run dev           # Dev server with hot reload
bun run start         # Production server
bun run test          # Run tests
bun run test:watch    # Tests in watch mode
bun run db:push       # Push schema to DB
bun run db:migrate    # Create migration
bun run db:generate   # Generate Prisma client
bun run db:studio     # Visual DB browser
bun run db:seed       # Seed test data
bun run release       # Bump patch version + push tag
```

## Docker

```bash
# Dev: PostgreSQL only (use with `bun run dev`)
docker compose up -d

# Local full stack: backend + postgres + monitoring
docker compose -f docker-compose.local.yml up -d --build

# Production: pre-built image from registry
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

| Compose File               | Use Case                        |
|----------------------------|---------------------------------|
| `docker-compose.yml`       | PostgreSQL only for local dev   |
| `docker-compose.local.yml` | Full stack with local build     |
| `docker-compose.prod.yml`  | Production with registry image  |

## Kubernetes (Minikube)

### Deploy

```bash
minikube start
bash k8s/deploy.sh
```

### Access Services (Docker driver on Windows/macOS)

The Minikube VM IP is not directly reachable. Use one of:

```bash
# Option A: tunnel all services (run in a separate terminal)
minikube tunnel
# Then access: localhost:30080, localhost:30090, localhost:30030

# Option B: tunnel individual services
minikube service backend-svc -n node-app
minikube service prometheus-svc -n node-app
minikube service grafana-svc -n node-app
```

### Services

| Service    | NodePort | Credentials |
|------------|----------|-------------|
| Backend    | 30080    | -           |
| Prometheus | 30090    | -           |
| Grafana    | 30030    | admin/admin |

### Common Commands

```bash
kubectl get pods -n node-app
kubectl logs -f -l app=backend -n node-app
kubectl get hpa -n node-app
kubectl top pods -n node-app

# Push schema on first deploy
kubectl exec -it deploy/backend -n node-app -- bunx prisma db push

# Update image (triggers rolling update)
kubectl set image deploy/backend backend=verma2904/node-backend:v1.0.7 -n node-app
```

### Tear Down

```bash
bash k8s/destroy.sh
```

## CI/CD Pipeline

Automated deployment via GitHub Actions. The pipeline triggers on version tags (`backend-v*`).

### Workflow

```
git tag push → GitHub Actions → Test → Build → Push to Registry → Deploy
```

**Pipeline stages:**

1. **Test** — spins up a PostgreSQL service container, installs deps, generates Prisma client, runs type checking and full test suite
2. **Build** — builds multi-stage Docker image with Buildx (layer caching via GHA cache)
3. **Push** — pushes to Docker registry with `latest` + versioned tag (e.g., `v1.0.6`)

### Release Process

```bash
# Bump version, stage, and get the commit+tag+push command
bun run release          # patch: 1.0.6 → 1.0.7
bun run release:minor    # minor: 1.0.6 → 1.1.0
bun run release:major    # major: 1.0.6 → 2.0.0

# Run the printed command to commit, tag, and push
# This triggers the CI/CD pipeline automatically
```

### Pipeline Triggers

| Trigger               | Action                              |
|-----------------------|-------------------------------------|
| `backend-v*` tag push | Full pipeline: test → build → push |

## Production Infrastructure (AWS)

Production runs on AWS, provisioned entirely via **Terraform** (Infrastructure as Code).

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        AWS Cloud                         │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │     ECR     │    │     EKS      │    │    RDS    │  │
│  │  (Docker    │───▶│  (Kubernetes │───▶│(PostgreSQL)│  │
│  │   Registry) │    │   Cluster)   │    │           │  │
│  └─────────────┘    └──────────────┘    └───────────┘  │
│                            │                            │
│                            ▼                            │
│                     ┌─────────────┐                     │
│                     │   Kinesis   │                     │
│                     │  (Secrets   │                     │
│                     │  Management)│                     │
│                     └─────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### AWS Services

| Service                        | Purpose                                      |
|--------------------------------|----------------------------------------------|
| **EKS** (Elastic Kubernetes)   | Production Kubernetes cluster                |
| **ECR** (Container Registry)   | Private Docker image storage                 |
| **RDS** (PostgreSQL)           | Managed database with backups and failover   |
| **Kinesis / Secrets Manager**  | Secure credential and secret management      |
| **Terraform**                  | Infrastructure as Code — all resources versioned |

### How It Works

- Docker images are pushed to **ECR** (instead of Docker Hub in dev)
- **EKS** runs the same Kubernetes manifests as local Minikube (with production values)
- Database credentials, JWT secrets, and API keys are stored in **AWS Secrets Manager / Kinesis**
- All infrastructure is defined in Terraform — reproducible, auditable, and version-controlled
- Rolling updates with zero downtime via EKS deployment strategies

### Dev vs Production

| Concern         | Local (Minikube)         | Production (AWS)              |
|-----------------|--------------------------|-------------------------------|
| K8s Cluster     | Minikube                 | EKS                           |
| Docker Registry | Docker Hub               | ECR                           |
| Database        | PostgreSQL in pod        | RDS (managed, multi-AZ)      |
| Secrets         | K8s Secrets (base64)     | AWS Secrets Manager / Kinesis |
| Scaling         | HPA (2-10 pods)          | HPA + cluster autoscaler      |
| Monitoring      | Prometheus + Grafana pod | CloudWatch + Prometheus       |
| TLS             | None                     | ACM + ALB                     |

## Monitoring

| Metric                        | Source     |
|-------------------------------|------------|
| Request rate by route/method  | Prometheus |
| Response time (p50/p95/p99)   | Prometheus |
| Error rate (4xx/5xx)          | Prometheus |
| Auth attempts                 | Prometheus |
| Application logs (all levels) | Loki       |

Grafana comes pre-configured with Prometheus and Loki datasources.

## Project Structure

```
src/
├── server.ts              # Entry point, graceful shutdown
├── app.ts                 # Express setup, middleware, routes
├── config/
│   ├── db.ts              # Prisma client
│   ├── env.ts             # Zod-validated env vars
│   ├── logger.ts          # Winston + Loki transport
│   └── metrics.ts         # Prometheus registry
├── middleware/
│   ├── auth.middleware.ts  # JWT verification
│   ├── role.middleware.ts  # Role-based access
│   ├── error.middleware.ts # Global error handler
│   └── metrics.middleware.ts
├── modules/
│   ├── auth/              # Signup, login, OTP, password reset
│   ├── user/              # Profile management
│   ├── group/             # CRUD with ownership
│   ├── member/            # Add/remove/role changes
│   └── logs/              # Audit trail per group
├── services/
│   ├── email.service.ts   # Nodemailer SMTP
│   └── log.service.ts     # Audit log writer
├── jobs/
│   └── otpCleanup.ts      # Expired OTP cleanup
└── utils/
```

## Testing

```bash
# Requires PostgreSQL running
bun run test

# Watch mode
bun run test:watch
```

Tests use Vitest + Supertest for integration testing against a real database.

## License

Private
