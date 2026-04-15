import { prisma } from "../config/db";
import logger from "../config/logger";

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

/** Delete expired OTPs and refresh tokens periodically */
export function startOTPCleanupJob() {
  async function cleanup() {
    try {
      const otpResult = await prisma.oTP.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      const tokenResult = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      if (otpResult.count > 0 || tokenResult.count > 0) {
        logger.info(`Cleanup: removed ${otpResult.count} expired OTPs, ${tokenResult.count} expired refresh tokens`);
      }
    } catch (error) {
      logger.error("Cleanup job failed", { error });
    }
  }

  // Run immediately, then on interval
  cleanup();
  setInterval(cleanup, CLEANUP_INTERVAL);
  logger.info("OTP cleanup job started");
}
