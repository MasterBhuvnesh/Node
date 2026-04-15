# ==============================================================================
# Node Backend - Production Dockerfile
# ==============================================================================
# What: Multi-stage Docker build for the Node backend API.
# Why:  Multi-stage builds separate build dependencies from runtime,
#       resulting in a smaller, more secure production image.
# How:  Stage 1 installs ALL deps (including dev) for building.
#       Stage 2 installs ONLY production deps for runtime.
#       Stage 3 copies built output + production deps into a clean image.
# ==============================================================================

# --- Stage 1: Base -----------------------------------------------------------
# What: Sets the base image and working directory for all stages.
# Why:  Using oven/bun:1-alpine for a minimal image with Bun pre-installed.
# How:  All subsequent stages inherit from this base.
# -----------------------------------------------------------------------------
FROM oven/bun:1-alpine AS base
WORKDIR /app

# --- Stage 2: Install Dependencies -------------------------------------------
# What: Install ALL dependencies (including devDependencies) needed for build.
# Why:  Prisma CLI and TypeScript are devDependencies required to generate
#       the Prisma client and type-check the project during build.
# How:  Copy only package.json and bun.lock first (Docker layer caching).
#       If these files haven't changed, Docker reuses the cached layer,
#       making rebuilds much faster.
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Stage 3: Build ----------------------------------------------------------
# What: Generate the Prisma client and verify the project compiles.
# Why:  The Prisma client is auto-generated code that provides type-safe
#       database queries. It must be generated before the app can run.
#       We also copy the full source so Bun can resolve all imports at runtime.
# How:  Copy node_modules from deps stage, then copy source code,
#       then run prisma generate to create the client in generated/prisma/.
# -----------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate

# --- Stage 4: Production -----------------------------------------------------
# What: Final minimal image that runs the API server.
# Why:  We only include what's needed to run — no build tools, no dev deps,
#       no source maps. This reduces image size and attack surface.
# How:  Copy the full project from the build stage (source + generated client
#       + node_modules). Bun runs TypeScript directly, so no compile step needed.
#       The HEALTHCHECK lets Docker (and orchestrators like K8s) know if the
#       container is alive. SIGTERM handling in server.ts ensures clean shutdown.
# -----------------------------------------------------------------------------
FROM base AS production

# What: Create a non-root user for security.
# Why:  Running as root inside containers is a security risk — if the app
#       is compromised, the attacker gets root access to the container.
# How:  Alpine's addgroup/adduser creates a system user with no login shell.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# What: Copy only the files needed to run the application.
# Why:  Keeps the final image clean — no dev dependencies, no build artifacts.
# How:  node_modules from deps, generated prisma client + source from build.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/generated ./generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json

# What: Create a directory for Winston log files.
# Why:  Winston writes logs to /app/logs/ in production. The directory
#       must exist and be writable by the non-root user.
# How:  Create the dir and change ownership before switching users.
RUN mkdir -p logs && chown -R appuser:appgroup /app

# What: Switch to the non-root user.
# Why:  Principle of least privilege — the app doesn't need root.
USER appuser

# What: Set environment to production.
# Why:  Many libraries (Express, Winston, etc.) change behavior in production:
#       less verbose logging, optimized error handling, etc.
ENV NODE_ENV=production

# What: Expose the API port.
# Why:  Documents which port the container listens on. Does NOT publish it —
#       you still need -p 3000:3000 when running the container.
EXPOSE 3000

# What: Health check to verify the container is serving requests.
# Why:  Docker and orchestrators (K8s, ECS) use this to restart unhealthy
#       containers automatically. Without it, a crashed server stays "running".
# How:  Hits the /health endpoint every 30s. If it fails 3 times, Docker
#       marks the container as unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# What: Start the application.
# Why:  Bun runs TypeScript natively — no transpile step needed.
# How:  Directly executes src/server.ts which starts Express on port 3000.
CMD ["bun", "run", "src/server.ts"]
