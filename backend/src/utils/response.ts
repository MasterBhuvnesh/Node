import type { Response } from "express";

export function sendSuccess(res: Response, data: unknown = null, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function sendError(res: Response, message = "Something went wrong", status = 500) {
  return res.status(status).json({ success: false, message });
}
