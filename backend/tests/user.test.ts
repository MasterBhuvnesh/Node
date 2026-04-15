import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { cleanDB, createTestUser, loginUser, request, prisma } from "./setup";

beforeAll(async () => { await prisma.$connect(); });
afterAll(async () => { await prisma.$disconnect(); });
beforeEach(cleanDB);

describe("GET /users/me", () => {
  it("returns profile for authenticated user", async () => {
    const user = await createTestUser({ email: "me@example.com", name: "Me" });
    const login = await loginUser("me@example.com");

    const res = await request.get("/users/me").set("Authorization", `Bearer ${login.data.accessToken}`);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.name).toBe("Me");
    expect(res.body.data.email).toBe("me@example.com");
    expect(res.body.data.password).toBeUndefined();
  });

  it("rejects unauthenticated request", async () => {
    const res = await request.get("/users/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Authentication required");
  });

  it("rejects invalid token", async () => {
    const res = await request.get("/users/me").set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /users/me", () => {
  it("updates user name", async () => {
    await createTestUser({ email: "update@example.com", name: "Old Name" });
    const login = await loginUser("update@example.com");

    const res = await request
      .put("/users/me")
      .set("Authorization", `Bearer ${login.data.accessToken}`)
      .send({ name: "New Name" });

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("New Name");
  });

  it("rejects empty name", async () => {
    await createTestUser({ email: "empty@example.com" });
    const login = await loginUser("empty@example.com");

    const res = await request
      .put("/users/me")
      .set("Authorization", `Bearer ${login.data.accessToken}`)
      .send({ name: "" });

    expect(res.body.success).toBe(false);
  });
});
