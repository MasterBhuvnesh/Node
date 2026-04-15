import { prisma } from "../../config/db";
import { Role } from "@prisma/client";
import { createLog } from "../../services/log.service";

/** Add a member to a group by email */
export async function addMember(groupId: string, email: string, performedBy: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  });
  if (existing) throw new Error("User is already a member");

  const member = await prisma.groupMember.create({
    data: { userId: user.id, groupId, role: "MEMBER" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await createLog({
    groupId,
    action: "MEMBER_ADDED",
    message: `${user.name} added to group`,
    performedBy,
    targetUserId: user.id,
  });

  return member;
}

/** Remove a member from a group */
export async function removeMember(groupId: string, targetUserId: string, performedBy: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: targetUserId, groupId } },
    include: { user: { select: { name: true } } },
  });
  if (!membership) throw new Error("Member not found");
  if (membership.role === "OWNER") throw new Error("Cannot remove the owner");

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });

  await createLog({
    groupId,
    action: "MEMBER_REMOVED",
    message: `${membership.user.name} removed from group`,
    performedBy,
    targetUserId,
  });

  return { message: "Member removed" };
}

/** Update a member's role (OWNER only) */
export async function updateMemberRole(
  groupId: string,
  targetUserId: string,
  role: Role,
  performedBy: string
) {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: targetUserId, groupId } },
    include: { user: { select: { name: true } } },
  });
  if (!membership) throw new Error("Member not found");
  if (membership.role === "OWNER") throw new Error("Cannot change owner role");

  const updated = await prisma.groupMember.update({
    where: { userId_groupId: { userId: targetUserId, groupId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await createLog({
    groupId,
    action: "ROLE_UPDATED",
    message: `${membership.user.name} role changed to ${role}`,
    performedBy,
    targetUserId,
  });

  return updated;
}
