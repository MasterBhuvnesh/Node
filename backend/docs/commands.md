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
