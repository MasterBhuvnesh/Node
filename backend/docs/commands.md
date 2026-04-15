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

# 2. Copy environment file and fill in your values
cp .env.example .env

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

## Docker - Full Application

```bash
# Build the backend image
docker build -t node-backend:latest .

# Run the backend container (connects to the PostgreSQL container)
docker run -d --name node-backend \
  --network backend_default \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://node_user:node_pass@node_postgres:5432/node_db" \
  -e JWT_SECRET="your-secret" \
  -e JWT_REFRESH_SECRET="your-refresh-secret" \
  -e SMTP_HOST="smtp.gmail.com" \
  -e SMTP_PORT="587" \
  -e SMTP_USER="your-email" \
  -e SMTP_PASSWORD="your-password" \
  -e EMAIL_FROM="App <noreply@example.com>" \
  -e NODE_ENV="production" \
  node-backend:latest

# Check container status
docker ps

# Check container health
docker inspect node-backend --format='{{.State.Health.Status}}'

# View container logs
docker logs node-backend
docker logs -f node-backend  # follow mode

# Stop and remove
docker stop node-backend && docker rm node-backend
```

> When running the backend container alongside PostgreSQL, both must be
> on the same Docker network (`backend_default`). The DATABASE_URL
> should use the container name (`node_postgres`) instead of `localhost`.

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
