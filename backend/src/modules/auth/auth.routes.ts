import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "./auth.controller";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: "Too many attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many OTP attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post("/signup", authLimiter, authController.signup);
router.post("/login", authLimiter, authController.login);
router.post("/verify-otp", otpLimiter, authController.verifyOTP);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", otpLimiter, authController.resetPassword);
router.post("/logout", authController.logout);

export default router;
