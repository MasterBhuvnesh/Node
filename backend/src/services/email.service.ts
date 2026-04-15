import nodemailer from "nodemailer";
import { env } from "../config/env";
import logger from "../config/logger";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendOTPEmail(to: string, code: string, type: "verification" | "password_reset") {
  const subject = type === "verification" ? "Verify your account" : "Reset your password";
  const text = `Your OTP code is: ${code}. It expires in 10 minutes.`;

  try {
    await transporter.sendMail({
      from: env.SMTP_USER,
      to,
      subject,
      text,
    });
    logger.info(`OTP email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send OTP email to ${to}`, { error });
    // Don't throw — email failure shouldn't block auth flow in dev
    if (env.NODE_ENV === "production") throw error;
  }
}
