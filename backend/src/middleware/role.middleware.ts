import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { sendError } from "../utils/response";
import type { Role } from "@prisma/client";

/**
 * Authorize user based on their role within a group.
 * Expects :id param (groupId) and userId from auth middleware.
 */
export function authorize(roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const groupId = req.params.id as string;

    if (!userId || !groupId) {
      return sendError(res, "Missing user or group context", 400);
    }

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      return sendError(res, "You are not a member of this group", 403);
    }

    if (!roles.includes(membership.role)) {
      return sendError(res, "Insufficient permissions", 403);
    }

    next();
  };
}
