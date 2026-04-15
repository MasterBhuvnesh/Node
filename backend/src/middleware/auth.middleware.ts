import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { sendError } from "../utils/response";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Verify JWT access token and attach userId to request */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return sendError(res, "Authentication required", 401);
  }

  try {
    const token = header.split(" ")[1]!;
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    return sendError(res, "Invalid or expired token", 401);
  }
}
