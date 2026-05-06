# Backend Commands Reference

All commands should be run from the `backend/` directory.

---

## Prerequisites

- [Bun](https://bun.sh) installed
- [Docker](https://docs.docker.com/get-docker/) installed and running

---

## First Time Setup

```bash
# 1. Install dependencies
bun install

# 2. Copy environment files and fill in your values
cp .env.example .env
cp .env.example .env.docker
# In .env.docker, change DATABASE_URL to use node_postgres:5432 and NODE_ENV to production

# 3. Start PostgreSQL (Docker)
docker compose up -d

# 4. Push database schema to PostgreSQL
bun run db:push

# 5. Generate Prisma client
bun run db:generate

# 6. Start development server
bun run dev
```

The API will be available at `http://localhost:3000`.

---

## Development

```bash
# Start dev server (auto-restarts on file changes)
bun run dev

# Start server (no auto-restart)
bun run start

# Type-check the project (no output = no errors)
bunx tsc --noEmit

# Run tests (requires PostgreSQL running)
bun run test

# Run tests in watch mode
bun run test:watch
```

---

## Database (Prisma)

```bash
# Push schema changes to the database (no migration files)
bun run db:push

# Create a migration (creates SQL migration files)
bun run db:migrate

# Generate Prisma client after schema changes
bun run db:generate

# Open Prisma Studio (visual database browser)
bun run db:studio

# Seed the database with test data
bun run db:seed
```

> After editing `prisma/schema.prisma`, always run `db:push` (dev) or `db:migrate` (prod),
> then `db:generate` to update the Prisma client.

---

## Docker - PostgreSQL Only

Uses the base `docker-compose.yml` — just PostgreSQL, for when you run the backend with `bun run dev`.

```bash
# Start PostgreSQL container
docker compose up -d

# Stop PostgreSQL container
docker compose down

# Stop and delete all data (fresh start)
docker compose down -v

# View PostgreSQL logs
docker logs node_postgres

# Connect to PostgreSQL directly
docker exec -it node_postgres psql -U node_user -d node_db
```

---

## Docker - Local (full stack)

Uses `docker-compose.local.yml` — builds the backend from your Dockerfile and starts it alongside PostgreSQL. Reads env from `.env.docker`.

```bash
# Start everything (builds backend image + starts PostgreSQL)
docker compose -f docker-compose.local.yml up -d --build

# Start without rebuilding (uses cached image)
docker compose -f docker-compose.local.yml up -d

# View logs
docker compose -f docker-compose.local.yml logs -f backend

# Stop everything
docker compose -f docker-compose.local.yml down

# Stop and delete all data (fresh start)
docker compose -f docker-compose.local.yml down -v
```

---

## Docker - Production

Uses `docker-compose.prod.yml` — pulls a pre-built image from a registry. All env variables come from `.env.prod`.

```bash
# 1. Copy and fill in production secrets
cp .env.prod.example .env.prod

# 2. Start everything
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f backend

# Stop everything
docker compose -f docker-compose.prod.yml down
```

---

## Docker - Common

```bash
# Check container status
docker ps

# Check backend health
docker inspect node_backend --format='{{.State.Health.Status}}'

# View backend logs
docker logs node_backend
docker logs -f node_backend  # follow mode
```

> **Why different compose files?**
> - `docker-compose.yml` — PostgreSQL only, for local dev with `bun run dev`
> - `docker-compose.local.yml` — builds backend from Dockerfile + PostgreSQL, reads `.env.docker`
> - `docker-compose.prod.yml` — pulls pre-built image + PostgreSQL, reads `.env.prod`
>
> **Why different `.env` files?**
> - `.env` — for `bun run dev`, uses `localhost:5433`
> - `.env.docker` — for local Docker, uses `node_postgres:5432`
> - `.env.prod` — for production, real secrets + registry image URL

---

## Monitoring (Prometheus + Grafana + Loki)

Included in `docker-compose.local.yml`. When you run the local stack, these are available:

| Service    | URL                          | Credentials   |
|------------|------------------------------|---------------|
| Prometheus | http://localhost:9090         | —             |
| Grafana    | http://localhost:3001         | admin / admin |
| Loki       | http://localhost:3100         | —             |
| Metrics    | http://localhost:3000/metrics | —             |

Grafana comes pre-configured with Prometheus + Loki datasources and a "Node Backend" dashboard:

**Metrics (Prometheus):**
- Request rate by method and route
- Response time percentiles (p50/p95/p99)
- Error rate (4xx/5xx)
- Auth attempts (success/failure)
- Active requests, memory usage, event loop lag, CPU

**Logs (Loki):**
- Application logs (all levels)
- Error logs (filtered)
- Log rate by level (info/warn/error)

---

## API Endpoints

### Auth (no token required)

| Method | Endpoint               | Body                                      |
|--------|------------------------|--------------------------------------------|
| POST   | `/auth/signup`          | `{ name, email, password }`               |
| POST   | `/auth/login`           | `{ email, password }`                     |
| POST   | `/auth/verify-otp`      | `{ email, code }`                         |
| POST   | `/auth/refresh-token`   | `{ refreshToken }`                        |
| POST   | `/auth/forgot-password` | `{ email }`                               |
| POST   | `/auth/reset-password`  | `{ email, code, newPassword }`            |
| POST   | `/auth/logout`          | `{ refreshToken }`                        |

### User Profile (token required)

| Method | Endpoint      | Body           |
|--------|---------------|----------------|
| GET    | `/users/me`   | -              |
| PUT    | `/users/me`   | `{ name }`     |

### Groups (token required)

| Method | Endpoint        | Body           | Permission     |
|--------|-----------------|----------------|----------------|
| GET    | `/groups`       | -              | Any member     |
| POST   | `/groups`       | `{ name }`     | Any user       |
| GET    | `/groups/:id`   | -              | Group member   |
| PUT    | `/groups/:id`   | `{ name }`     | Owner, Leader  |
| DELETE | `/groups/:id`   | -              | Owner only     |

### Members (token required)

| Method | Endpoint                          | Body           | Permission     |
|--------|-----------------------------------|----------------|----------------|
| POST   | `/groups/:id/members`             | `{ email }`    | Owner, Leader  |
| DELETE | `/groups/:id/members/:userId`     | -              | Owner, Leader  |
| PUT    | `/groups/:id/members/:userId/role`| `{ role }`     | Owner only     |

> `role` must be `"LEADER"` or `"MEMBER"`.

### Logs (token required)

| Method | Endpoint             | Query Params          | Permission   |
|--------|----------------------|-----------------------|--------------|
| GET    | `/groups/:id/logs`   | `?cursor=X&take=20`  | Group member |

### Health Check

| Method | Endpoint   |
|--------|------------|
| GET    | `/health`  |

---

## Testing an Endpoint (curl example)

```bash
# Signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"pass123"}'

# Login (after verifying OTP)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'

# Use the accessToken from login response
TOKEN="your-access-token-here"

# Create a group
curl -X POST http://localhost:3000/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Group"}'

# List groups
curl http://localhost:3000/groups \
  -H "Authorization: Bearer $TOKEN"
```

---

## Environment Variables

| Variable           | Required | Description                          |
|--------------------|----------|--------------------------------------|
| `DATABASE_URL`     | Yes      | PostgreSQL connection string         |
| `JWT_SECRET`       | Yes      | Secret key for access tokens         |
| `JWT_REFRESH_SECRET`| Yes     | Secret key for refresh tokens        |
| `SMTP_HOST`        | Yes      | Email SMTP host                      |
| `SMTP_PORT`        | No       | Email SMTP port (default: 587)       |
| `SMTP_USER`        | Yes      | Email sender address                 |
| `SMTP_PASSWORD`    | Yes      | Email app password                   |
| `EMAIL_FROM`       | Yes      | From field in emails                 |
| `PORT`             | No       | Server port (default: 3000)          |
| `NODE_ENV`         | No       | `development` / `production` / `test`|

---

## Kubernetes (Minikube)

### Prerequisites

```bash
# Install minikube and kubectl
# Start minikube
minikube start

# Enable metrics-server (required for HPA autoscaling)
minikube addons enable metrics-server
```

### Deploy Everything

```bash
# From the backend/ directory
bash k8s/deploy.sh
```

This creates:
- **Namespace** `node-app` — isolates all resources
- **PostgreSQL** with persistent storage
- **Backend** (2 replicas) with auto-scaling (2→10 pods)
- **Prometheus** scraping backend /metrics
- **Loki** receiving logs from winston-loki
- **Grafana** with pre-configured datasources

### Access URLs

```bash
# Get your Minikube IP
minikube ip

# Then access:
# Backend API:   http://<minikube-ip>:30080
# Prometheus:    http://<minikube-ip>:30090
# Grafana:       http://<minikube-ip>:30030  (admin/admin)
```

### Common Commands

```bash
# See all pods
kubectl get pods -n node-app

# See all services
kubectl get svc -n node-app

# Tail backend logs
kubectl logs -f -l app=backend -n node-app

# Check autoscaler status
kubectl get hpa -n node-app

# Resource usage per pod
kubectl top pods -n node-app

# Push Prisma schema (first deploy)
kubectl exec -it deploy/backend -n node-app -- bunx prisma db push

# Open a shell inside a backend pod
kubectl exec -it deploy/backend -n node-app -- sh
```

### Update Backend Image

```bash
# After pushing a new Docker image:
docker build -t verma2904/node-backend:v1.0.7 .
docker push verma2904/node-backend:v1.0.7

# Tell K8s to use the new image (triggers rolling update):
kubectl set image deploy/backend backend=verma2904/node-backend:v1.0.7 -n node-app

# Watch the rolling update:
kubectl rollout status deploy/backend -n node-app
```

### Tear Down

```bash
bash k8s/destroy.sh
```

### File Structure

```
k8s/
├── namespace.yml                        # Isolated environment
├── deploy.sh                            # One-command deploy
├── destroy.sh                           # One-command teardown
├── backend/
│   ├── configmap.yml                    # Non-sensitive env vars
│   ├── secret.yml                       # Passwords, JWT keys (base64)
│   ├── deployment.yml                   # 2 replicas, rolling updates, health checks
│   ├── service.yml                      # NodePort :30080
│   └── hpa.yml                          # Auto-scale 2→10 on CPU/memory
├── postgres/
│   ├── secret.yml                       # DB credentials
│   ├── pvc.yml                          # Persistent storage (5Gi)
│   ├── deployment.yml                   # Single replica
│   └── service.yml                      # ClusterIP (internal only)
└── monitoring/
    ├── prometheus/
    │   ├── configmap.yml                # Scrape config
    │   ├── deployment.yml               # Metrics collector
    │   └── service.yml                  # NodePort :30090
    ├── loki/
    │   ├── configmap.yml                # Loki config
    │   ├── deployment.yml               # Log aggregator
    │   └── service.yml                  # ClusterIP (internal)
    └── grafana/
        ├── configmap.yml                # Datasource provisioning
        ├── deployment.yml               # Dashboard UI
        └── service.yml                  # NodePort :30030
```
