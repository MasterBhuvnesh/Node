import { prisma } from "../../config/db";
import { hashPassword, comparePassword } from "../../utils/hash";
import { generateOTP, getOTPExpiry } from "../../utils/otp";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { sendOTPEmail } from "../../services/email.service";
import crypto from "crypto";

/** Register a new user and send verification OTP */
export async function signup(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already registered");

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  });

  // Clean up any existing OTPs for this email
  await prisma.oTP.deleteMany({ where: { email, type: "verification" } });

  const code = generateOTP();
  await prisma.oTP.create({
    data: { email, code, type: "verification", expiresAt: getOTPExpiry() },
  });

  await sendOTPEmail(email, code, "verification");

  return { id: user.id, email: user.email };
}

/** Verify account with OTP */
export async function verifyOTP(email: string, code: string) {
  const otp = await prisma.oTP.findFirst({
    where: { email, code, type: "verification", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new Error("Invalid or expired OTP");

  await prisma.user.update({ where: { email }, data: { verified: true } });
  await prisma.oTP.deleteMany({ where: { email, type: "verification" } });

  return { message: "Account verified" };
}

/** Login and return access + refresh tokens */
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  if (!user.verified) throw new Error("Account not verified");

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new Error("Invalid credentials");

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id });

  // Store hashed refresh token
  const hashedToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email },
  };
}

/** Refresh token rotation — returns new access + refresh tokens */
export async function refreshAccessToken(token: string) {
  const payload = verifyRefreshToken(token);

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const stored = await prisma.refreshToken.findUnique({ where: { token: hashedToken } });
  if (!stored) throw new Error("Invalid refresh token");

  // Delete old token (rotation)
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const accessToken = signAccessToken({ userId: payload.userId });
  const newRefreshToken = signRefreshToken({ userId: payload.userId });

  const newHashedToken = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      token: newHashedToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

/** Send password reset OTP (always returns success to prevent user enumeration) */
export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { message: "If the email exists, a reset OTP has been sent" };

  const code = generateOTP();
  await prisma.oTP.create({
    data: { email, code, type: "password_reset", expiresAt: getOTPExpiry() },
  });

  await sendOTPEmail(email, code, "password_reset");

  return { message: "If the email exists, a reset OTP has been sent" };
}

/** Reset password using OTP */
export async function resetPassword(email: string, code: string, newPassword: string) {
  const otp = await prisma.oTP.findFirst({
    where: { email, code, type: "password_reset", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new Error("Invalid or expired OTP");

  const hashed = await hashPassword(newPassword);

  // Atomic: update password + delete OTPs + invalidate all refresh tokens
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { email }, data: { password: hashed } });
    await tx.oTP.deleteMany({ where: { email, type: "password_reset" } });
    await tx.refreshToken.deleteMany({ where: { userId: user.id } });
  });

  return { message: "Password reset successful" };
}

/** Logout — delete the refresh token */
export async function logout(refreshToken: string) {
  const hashedToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await prisma.refreshToken.deleteMany({ where: { token: hashedToken } });
  return { message: "Logged out" };
}
