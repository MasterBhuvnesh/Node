import crypto from "crypto";

/** Generate a 6-digit OTP code */
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/** Get OTP expiry time (10 minutes from now) */
export function getOTPExpiry(): Date {
  return new Date(Date.now() + 10 * 60 * 1000);
}
