import type { Request, Response } from "express";
import * as memberService from "./member.service";
import { sendSuccess, sendError } from "../../utils/response";
import { addMemberSchema, updateRoleSchema } from "./member.schema";
import logger from "../../config/logger";

export async function addMember(req: Request, res: Response) {
  try {
    const data = addMemberSchema.parse(req.body);
    const member = await memberService.addMember(req.params.id as string, data.email, req.userId!);
    return sendSuccess(res, member, "Member added", 201);
  } catch (err: any) {
    logger.error(`Add member failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}

export async function removeMember(req: Request, res: Response) {
  try {
    const result = await memberService.removeMember(req.params.id as string, req.params.userId as string, req.userId!);
    return sendSuccess(res, result, "Member removed");
  } catch (err: any) {
    logger.error(`Remove member failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}

export async function updateMemberRole(req: Request, res: Response) {
  try {
    const data = updateRoleSchema.parse(req.body);
    const result = await memberService.updateMemberRole(
      req.params.id as string,
      req.params.userId as string,
      data.role,
      req.userId!
    );
    return sendSuccess(res, result, "Role updated");
  } catch (err: any) {
    logger.error(`Update role failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}
