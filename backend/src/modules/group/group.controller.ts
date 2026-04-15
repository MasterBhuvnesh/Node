import type { Request, Response } from "express";
import * as groupService from "./group.service";
import { sendSuccess, sendError } from "../../utils/response";
import { createGroupSchema, updateGroupSchema } from "./group.schema";
import logger from "../../config/logger";

export async function createGroup(req: Request, res: Response) {
  try {
    const data = createGroupSchema.parse(req.body);
    const group = await groupService.createGroup(data.name, req.userId!);
    return sendSuccess(res, group, "Group created", 201);
  } catch (err: any) {
    logger.error(`Create group failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}

export async function getUserGroups(req: Request, res: Response) {
  try {
    const cursor = (req.query.cursor as string) || undefined;
    const raw = parseInt(String(req.query.take), 10);
    const take = Number.isNaN(raw) ? 20 : Math.max(1, Math.min(raw, 100));
    const result = await groupService.getUserGroups(req.userId!, cursor, take);
    return sendSuccess(res, result);
  } catch (err: any) {
    logger.error(`Get groups failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}

export async function getGroupById(req: Request, res: Response) {
  try {
    const group = await groupService.getGroupById(req.params.id as string);
    return sendSuccess(res, group);
  } catch (err: any) {
    return sendError(res, err.message, 404);
  }
}

export async function updateGroup(req: Request, res: Response) {
  try {
    const data = updateGroupSchema.parse(req.body);
    const group = await groupService.updateGroup(req.params.id as string, data.name, req.userId!);
    return sendSuccess(res, group, "Group updated");
  } catch (err: any) {
    logger.error(`Update group failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}

export async function deleteGroup(req: Request, res: Response) {
  try {
    const result = await groupService.deleteGroup(req.params.id as string, req.userId!);
    return sendSuccess(res, result, "Group deleted");
  } catch (err: any) {
    logger.error(`Delete group failed: ${err.message}`);
    return sendError(res, err.message, 400);
  }
}
