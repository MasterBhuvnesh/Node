import type { Request, Response } from "express";
import * as userService from "./user.service";
import { sendSuccess, sendError } from "../../utils/response";
import { updateProfileSchema } from "./user.schema";

export async function getProfile(req: Request, res: Response) {
  try {
    const user = await userService.getProfile(req.userId!);
    return sendSuccess(res, user);
  } catch (err: any) {
    return sendError(res, err.message, 404);
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await userService.updateProfile(req.userId!, data.name);
    return sendSuccess(res, user, "Profile updated");
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
}
