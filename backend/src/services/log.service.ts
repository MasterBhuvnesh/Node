import { prisma } from "../config/db";

interface CreateLogParams {
  groupId: string;
  action: string;
  message: string;
  performedBy: string;
  targetUserId?: string;
}

/** Create an activity log entry for a group action */
export async function createLog(params: CreateLogParams) {
  return prisma.log.create({ data: params });
}
