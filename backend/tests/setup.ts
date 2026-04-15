import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import supertest from "supertest";
import app from "../src/app";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });

export const request = supertest(app);

export const PASSWORD = "password123";

/** Clean all tables */
export async function cleanDB() {
  await prisma.log.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oTP.deleteMany();
  await prisma.user.deleteMany();
}

/** Create a verified test user */
export async function createTestUser(overrides: { name?: string; email?: string; verified?: boolean } = {}) {
  const hashed = await bcrypt.hash(PASSWORD, 4); // low rounds for speed
  return prisma.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `test-${Date.now()}@example.com`,
      password: hashed,
      verified: overrides.verified ?? true,
    },
  });
}

/** Login and return tokens */
export async function loginUser(email: string, password = PASSWORD) {
  const res = await request.post("/auth/login").send({ email, password });
  return res.body as {
    success: boolean;
    message: string;
    data: { accessToken: string; refreshToken: string; user: { id: string } };
  };
}
