import type { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

/** Global error handler */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ success: false, message: "Internal server error" });
}
