# Node Backend - Docker Image

REST API for group management with authentication, role-based access control, and full observability.

## Quick Run

```bash
docker pull verma2904/node-backend:latest
docker run -p 3000:3000 --env-file .env verma2904/node-backend:latest
```

## Image Details

| Property      | Value                              |
|---------------|------------------------------------|
| Base Image    | `oven/bun:1-alpine`                |
| Architecture  | Multi-stage (4 stages)             |
| Port          | 3000                               |
| User          | Non-root (`appuser`)               |
| Health Check  | `GET /health` every 30s            |
| Size          | ~150MB                             |

## Build Stages

```
Stage 1: base        → Alpine + Bun runtime
Stage 2: deps        → Install all dependencies (layer cached)
Stage 3: build       → Generate Prisma client
Stage 4: production  → Minimal runtime image (no dev deps)
```

## Environment Variables

| Variable             | Required | Default         |
|----------------------|----------|-----------------|
| `DATABASE_URL`       | Yes      | -               |
| `JWT_SECRET`         | Yes      | -               |
| `JWT_REFRESH_SECRET` | Yes      | -               |
| `SMTP_HOST`          | Yes      | `smtp.gmail.com`|
| `SMTP_PORT`          | No       | `587`           |
| `SMTP_USER`          | Yes      | -               |
| `SMTP_PASSWORD`      | Yes      | -               |
| `EMAIL_FROM`         | Yes      | -               |
| `PORT`               | No       | `3000`          |
| `NODE_ENV`           | No       | `production`    |
| `LOKI_URL`           | No       | -               |

## Docker Compose

```bash
# Local full stack (builds from source + PostgreSQL + monitoring)
docker compose -f docker-compose.local.yml up -d --build

# Production (pulls from registry)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## Endpoints

| Endpoint   | Description        |
|------------|--------------------|
| `/health`  | Health check (200) |
| `/metrics` | Prometheus metrics |
| `/auth/*`  | Authentication     |
| `/users/*` | User management    |
| `/groups/*`| Groups, members, logs |

## Tags

| Tag        | Description                    |
|------------|--------------------------------|
| `latest`   | Most recent build from main    |
| `v1.x.x`  | Versioned release              |

## Security

- Runs as non-root user (`appuser:appgroup`)
- Multi-stage build excludes dev dependencies and build tools
- Helmet for HTTP security headers
- bcrypt for password hashing
- Rate limiting on auth endpoints

## Tech Stack

- **Runtime:** Bun (TypeScript, no transpile step)
- **Framework:** Express 5
- **Database:** PostgreSQL 16 via Prisma ORM
- **Auth:** JWT access + refresh tokens, OTP verification
- **Monitoring:** Prometheus metrics, Winston + Loki logging
- **Validation:** Zod schema validation

## Source

GitHub: [github.com/MasterBhuvnesh](https://github.com/MasterBhuvnesh)
