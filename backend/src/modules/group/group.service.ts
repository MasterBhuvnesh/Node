import { prisma } from "../../config/db";
import { createLog } from "../../services/log.service";

/** Create a group and add creator as OWNER */
export async function createGroup(name: string, userId: string) {
  const group = await prisma.group.create({
    data: {
      name,
      members: {
        create: { userId, role: "OWNER" },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });

  await createLog({
    groupId: group.id,
    action: "GROUP_CREATED",
    message: `Group "${name}" created`,
    performedBy: userId,
  });

  return group;
}

/** Get all groups for a user (paginated) */
export async function getUserGroups(userId: string, cursor?: string, take = 20) {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = groups.length > take;
  const items = hasMore ? groups.slice(0, take) : groups;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  return { items, nextCursor };
}

/** Get a single group by ID */
export async function getGroupById(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!group) throw new Error("Group not found");
  return group;
}

/** Update group name (OWNER or LEADER) */
export async function updateGroup(groupId: string, name: string, userId: string) {
  const group = await prisma.group.update({
    where: { id: groupId },
    data: { name },
  });

  await createLog({
    groupId,
    action: "GROUP_UPDATED",
    message: `Group renamed to "${name}"`,
    performedBy: userId,
  });

  return group;
}

/** Delete group (OWNER only) */
export async function deleteGroup(groupId: string, userId: string) {
  await createLog({
    groupId,
    action: "GROUP_DELETED",
    message: "Group deleted",
    performedBy: userId,
  });

  await prisma.group.delete({ where: { id: groupId } });
  return { message: "Group deleted" };
}
