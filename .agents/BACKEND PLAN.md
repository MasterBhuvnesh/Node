BACKEND ARCHITECTURE OVERVIEW

- Runtime: Bun
- Language: TypeScript
- Framework: Express
- ORM: Prisma
- Database: PostgreSQL (Dockerized)
- Testing: Vitest + Supertest
- Logging: Winston
- Observability: Prometheus + Grafana + Loki
- Email: Nodemailer

---

PROJECT STRUCTURE (PRODUCTION GRADE)

```bash
src/
 ├── app.ts
 ├── server.ts

 ├── config/
 │    ├── env.ts
 │    ├── db.ts
 │    └── logger.ts

 ├── modules/
 │    ├── auth/
 │    ├── user/
 │    ├── group/
 │    ├── member/
 │    └── logs/

 ├── jobs/
 │    └── otpCleanup.ts

 ├── middleware/
 │    ├── auth.middleware.ts
 │    ├── role.middleware.ts
 │    └── error.middleware.ts

 ├── utils/
 │    ├── response.ts
 │    ├── hash.ts
 │    └── otp.ts

 ├── services/
 │    ├── email.service.ts
 │    └── log.service.ts

 ├── observability/
 │    ├── metrics.ts
 │    └── tracing.ts

tests/
 ├── integration/
 └── unit/
```

---

DOCKER SETUP (POSTGRES)

- Use docker-compose for local dev

- Services:
  - postgres
  - optional: pgadmin

- Key configs:
  - volume for persistence
  - port mapping (5432)
  - env variables (DB_USER, DB_PASS, DB_NAME)

---

PRISMA SETUP

- prisma/schema.prisma defines models
- Use migrations for version control

---

DATABASE MODELS (PRISMA DESIGN)

USER

```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  verified  Boolean  @default(false)
  createdAt DateTime @default(now())

  memberships   GroupMember[]
  refreshTokens RefreshToken[]
}
```

GROUP

```prisma
model Group {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())

  members   GroupMember[]
  logs      Log[]
}

NOTE: Ownership is derived from GroupMember where role = OWNER.
No separate ownerId field — single source of truth via the membership table.
```

GROUP MEMBER

```prisma
model GroupMember {
  id      String @id @default(uuid())
  userId  String
  groupId String
  role    Role

  user  User  @relation(fields: [userId], references: [id])
  group Group @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}

enum Role {
  OWNER
  LEADER
  MEMBER
}
```

LOG

```prisma
model Log {
  id           String   @id @default(uuid())
  groupId      String
  action       String
  message      String
  performedBy  String
  targetUserId String?
  createdAt    DateTime @default(now())

  group Group @relation(fields: [groupId], references: [id])
}

NOTE: targetUserId tracks who the action was performed on
(e.g., "User A removed User B" — performedBy=A, targetUserId=B).
```

OTP (EMAIL VERIFICATION)

```prisma
model OTP {
  id        String   @id @default(uuid())
  email     String
  code      String
  expiresAt DateTime
}

NOTE: Expired OTPs must be cleaned up periodically.
Use a scheduled cron job or Prisma middleware to delete records where expiresAt < now().

---

REFRESH TOKEN

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

NOTE: Refresh token rotation — on each refresh, old token is invalidated
and a new pair (access + refresh) is issued. Tokens stored hashed in DB.
```

---

AUTHENTICATION FLOW

- SIGNUP
  - Validate input
  - Hash password
  - Store user
  - Generate OTP
  - Send email via Nodemailer

- VERIFY OTP
  - Match code
  - Check expiry
  - Mark user as verified

- LOGIN
  - Validate credentials
  - Issue JWT

---

JWT STRATEGY

- Access token (short-lived, ~15 min)
- Refresh token (long-lived, ~7 days, stored hashed in DB)
- Middleware validates access token
- Attach user to request
- On access token expiry, client uses refresh token to get new pair
- Refresh token rotation: old token invalidated on each refresh

---

MIDDLEWARE DESIGN

AUTH MIDDLEWARE

- Extract token
- Verify JWT
- Attach userId to request

---

ROLE MIDDLEWARE

- Fetch membership from DB
- Check role against required roles

Leader permissions (hardcoded for now):
- Can: add/remove members, edit group name
- Cannot: delete group, change roles, transfer ownership

Example:

```ts
authorize(["OWNER", "LEADER"]);
```

---

ERROR HANDLING

- Centralized error middleware
- Standard response format

```json
{
  "success": false,
  "message": "Error message"
}
```

---

LOGGING STRATEGY

WINSTON

- Log levels: info, warn, error
- Output:
  - Console (dev)
  - File (prod)

---

LOKI INTEGRATION

- Push logs to Loki
- Structured JSON logs

---

APPLICATION LOGS (DOMAIN)

- Every group action triggers log entry:
  - Add member
  - Remove member
  - Update group

---

OBSERVABILITY

PROMETHEUS

- Metrics:
  - request_count
  - response_time
  - error_rate

---

GRAFANA

- Dashboards:
  - API latency
  - error rates
  - traffic

---

ROUTES DESIGN

AUTH

- POST /auth/signup
- POST /auth/login
- POST /auth/verify-otp
- POST /auth/refresh-token
- POST /auth/forgot-password
- POST /auth/reset-password
- POST /auth/logout

---

GROUP

- GET /groups (paginated, cursor-based)
- POST /groups
- GET /groups/:id
- PUT /groups/:id
- DELETE /groups/:id

---

MEMBERS

- POST /groups/:id/members
- DELETE /groups/:id/members/:userId
- PUT /groups/:id/members/:userId/role

---

USER PROFILE

- GET /users/me
- PUT /users/me

---

LOGS

- GET /groups/:id/logs (paginated, cursor-based)

---

SERVICE LAYER DESIGN

- Controllers → handle request/response
- Services → business logic
- Prisma → DB layer

Example flow:

```txt
Controller → Service → Prisma → DB
```

---

TESTING STRATEGY

VITEST

- Unit tests for services

SUPERTEST

- Integration tests for APIs

---

TEST CASES

- Auth:
  - signup success/failure
  - login success/failure
  - refresh token rotation
  - forgot/reset password flow

- Group:
  - create group
  - unauthorized access
  - pagination

- Members:
  - add/remove permission checks

- User Profile:
  - get/update profile

---

EMAIL SERVICE

NODEMAILER

- Send OTP emails
- Retry mechanism (optional)

---

SECURITY PRACTICES

- Hash passwords (bcrypt)
- Validate input (zod or similar)
- Rate limiting (auth routes)
- CORS configuration
- Helmet for headers

---

ENV VARIABLES (EXAMPLE)

```env
DATABASE_URL=
JWT_SECRET=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

---

PROFESSIONAL COMMENTING STYLE

- Use JSDoc style

Example:

```ts
/**
 * Create a new group
 * @param userId - ID of the creator
 * @param name - Group name
 * @returns Created group object
 */
```

---

DEVELOPMENT PHASES

PHASE 1

- Auth + DB setup

PHASE 2

- Group + member system

PHASE 3

- Logs system

PHASE 4

- Observability + logging

---

FUTURE EXTENSIONS

- WebSockets (real-time updates)
- Leader rotation logic
- Notifications system

---
