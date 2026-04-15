import type { Request, Response } from "express";
import * as logService from "./log.service";
import { sendSuccess, sendError } from "../../utils/response";

export async function getGroupLogs(req: Request, res: Response) {
  try {
    const cursor = (req.query.cursor as string) || undefined;
    const raw = parseInt(String(req.query.take), 10);
    const take = Number.isNaN(raw) ? 20 : Math.max(1, Math.min(raw, 100));
    const result = await logService.getGroupLogs(req.params.id as string, cursor, take);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
}
