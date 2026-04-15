import app from "./app";
import { env } from "./config/env";
import logger from "./config/logger";
import { prisma } from "./config/db";
import { startOTPCleanupJob } from "./jobs/otpCleanup";

async function main() {
  await prisma.$connect();
  logger.info("Database connected");

  startOTPCleanupJob();

  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
}

main().catch((err) => {
  logger.error("Failed to start server", { error: err });
  process.exit(1);
});
