import app from "./app";
import { env } from "./config/env";
import logger from "./config/logger";
import { prisma } from "./config/db";
import { startOTPCleanupJob } from "./jobs/otpCleanup";

async function main() {
  await prisma.$connect();
  logger.info("Database connected");

  startOTPCleanupJob();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      logger.info("HTTP server closed");
    });
    await prisma.$disconnect();
    logger.info("Database disconnected");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Failed to start server", { error: err });
  process.exit(1);
});
