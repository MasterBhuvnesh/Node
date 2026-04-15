import { prisma } from "../../config/db";

/** Get user profile */
export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, verified: true, createdAt: true },
  });
  if (!user) throw new Error("User not found");
  return user;
}

/** Update user profile */
export async function updateProfile(userId: string, name: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { id: true, name: true, email: true, verified: true, createdAt: true },
  });
}
