import { prisma } from "../../config/db";

/** Get paginated logs for a group */
export async function getGroupLogs(groupId: string, cursor?: string, take = 20) {
  const logs = await prisma.log.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = logs.length > take;
  const items = hasMore ? logs.slice(0, take) : logs;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  return { items, nextCursor };
}
