import type { Request, Response } from "express";
import * as authService from "./auth.service";
import { sendSuccess, sendError } from "../../utils/response";
import {
  signupSchema,
  loginSchema,
  verifyOTPSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schema";
import logger from "../../config/logger";
import { authAttemptsTotal } from "../../config/metrics";

export async function signup(req: Request, res: Response) {
  try {
    const data = signupSchema.parse(req.body);
    const result = await authService.signup(data.name, data.email, data.password);
    authAttemptsTotal.inc({ action: "signup", result: "success" });
    return sendSuccess(res, result, "Signup successful. Check email for OTP.", 201);
  } catch (err: any) {
    authAttemptsTotal.inc({ action: "signup", result: "failure" });
    logger.warn(`Signup failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    authAttemptsTotal.inc({ action: "login", result: "success" });
    return sendSuccess(res, result, "Login successful");
  } catch (err: any) {
    authAttemptsTotal.inc({ action: "login", result: "failure" });
    logger.warn(`Login failed: ${err.message}`);
    return sendError(res, err.message, 401);
  }
}

export async function verifyOTP(req: Request, res: Response) {
  try {
    const data = verifyOTPSchema.parse(req.body);
    const result = await authService.verifyOTP(data.email, data.code);
    return sendSuccess(res, result, "Account verified");
  } catch (err: any) {
    logger.warn(`OTP verification failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const result = await authService.refreshAccessToken(data.refreshToken);
    return sendSuccess(res, result, "Token refreshed");
  } catch (err: any) {
    logger.warn(`Token refresh failed: ${err.message}`);
    return sendError(res, err.message, 401);
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(data.email);
    return sendSuccess(res, result, "Reset OTP sent");
  } catch (err: any) {
    logger.warn(`Forgot password failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(data.email, data.code, data.newPassword);
    return sendSuccess(res, result, "Password reset successful");
  } catch (err: any) {
    logger.warn(`Reset password failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const result = await authService.logout(data.refreshToken);
    return sendSuccess(res, result, "Logged out");
  } catch (err: any) {
    logger.warn(`Logout failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}
