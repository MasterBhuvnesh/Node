import { z } from "zod";

export const addMemberSchema = z.object({
  email: z.string().email(),
});

export const updateRoleSchema = z.object({
  role: z.enum(["LEADER", "MEMBER"]),
});
