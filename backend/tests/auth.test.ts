import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { cleanDB, createTestUser, loginUser, request, prisma, PASSWORD } from "./setup";

beforeAll(async () => { await prisma.$connect(); });
afterAll(async () => { await prisma.$disconnect(); });
beforeEach(cleanDB);

describe("POST /auth/signup", () => {
  it("creates a new user and sends OTP", async () => {
    const res = await request.post("/auth/signup").send({
      name: "New User",
      email: "new@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("new@example.com");

    const otp = await prisma.oTP.findFirst({ where: { email: "new@example.com", type: "verification" } });
    expect(otp).not.toBeNull();
  });

  it("rejects duplicate email", async () => {
    await createTestUser({ email: "dup@example.com" });

    const res = await request.post("/auth/signup").send({
      name: "Dup",
      email: "dup@example.com",
      password: "password123",
    });

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("already registered");
  });

  it("rejects invalid body", async () => {
    const res = await request.post("/auth/signup").send({ email: "bad" });
    expect(res.body.success).toBe(false);
  });
});

describe("POST /auth/login", () => {
  it("returns tokens for valid credentials", async () => {
    const user = await createTestUser({ email: "login@example.com" });
    const body = await loginUser("login@example.com");

    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
    expect(body.data.user.id).toBe(user.id);
  });

  it("rejects wrong password", async () => {
    await createTestUser({ email: "wrong@example.com" });
    const body = await loginUser("wrong@example.com", "wrongpass");

    expect(body.success).toBe(false);
    expect(body.message).toContain("Invalid credentials");
  });

  it("rejects unverified user", async () => {
    await createTestUser({ email: "unverified@example.com", verified: false });
    const body = await loginUser("unverified@example.com");

    expect(body.success).toBe(false);
    expect(body.message).toContain("not verified");
  });

  it("rejects non-existent email", async () => {
    const body = await loginUser("ghost@example.com");
    expect(body.success).toBe(false);
  });
});

describe("POST /auth/verify-otp", () => {
  it("verifies a valid OTP", async () => {
    await createTestUser({ email: "verify@example.com", verified: false });
    await prisma.oTP.create({
      data: { email: "verify@example.com", code: "111111", type: "verification", expiresAt: new Date(Date.now() + 600_000) },
    });

    const res = await request.post("/auth/verify-otp").send({ email: "verify@example.com", code: "111111" });

    expect(res.body.success).toBe(true);

    const user = await prisma.user.findUnique({ where: { email: "verify@example.com" } });
    expect(user!.verified).toBe(true);
  });

  it("rejects expired OTP", async () => {
    await createTestUser({ email: "expired@example.com", verified: false });
    await prisma.oTP.create({
      data: { email: "expired@example.com", code: "222222", type: "verification", expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request.post("/auth/verify-otp").send({ email: "expired@example.com", code: "222222" });
    expect(res.body.success).toBe(false);
  });

  it("rejects wrong code", async () => {
    await createTestUser({ email: "wrongotp@example.com", verified: false });
    await prisma.oTP.create({
      data: { email: "wrongotp@example.com", code: "333333", type: "verification", expiresAt: new Date(Date.now() + 600_000) },
    });

    const res = await request.post("/auth/verify-otp").send({ email: "wrongotp@example.com", code: "999999" });
    expect(res.body.success).toBe(false);
  });
});

describe("POST /auth/refresh-token", () => {
  it("rotates tokens", async () => {
    await createTestUser({ email: "refresh@example.com" });
    const login = await loginUser("refresh@example.com");
    const oldRefresh = login.data.refreshToken;

    const res = await request.post("/auth/refresh-token").send({ refreshToken: oldRefresh });

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(oldRefresh);
  });

  it("rejects reused refresh token", async () => {
    await createTestUser({ email: "reuse@example.com" });
    const login = await loginUser("reuse@example.com");
    const oldRefresh = login.data.refreshToken;

    await request.post("/auth/refresh-token").send({ refreshToken: oldRefresh });
    const res = await request.post("/auth/refresh-token").send({ refreshToken: oldRefresh });

    expect(res.body.success).toBe(false);
  });
});

describe("POST /auth/forgot-password", () => {
  it("returns generic message for existing user", async () => {
    await createTestUser({ email: "forgot@example.com" });
    const res = await request.post("/auth/forgot-password").send({ email: "forgot@example.com" });

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain("If the email exists");
  });

  it("returns same generic message for non-existent user (no enumeration)", async () => {
    const res = await request.post("/auth/forgot-password").send({ email: "nobody@example.com" });

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain("If the email exists");
  });
});

describe("POST /auth/reset-password", () => {
  it("resets password with valid OTP", async () => {
    await createTestUser({ email: "reset@example.com" });
    await prisma.oTP.create({
      data: { email: "reset@example.com", code: "444444", type: "password_reset", expiresAt: new Date(Date.now() + 600_000) },
    });

    const res = await request.post("/auth/reset-password").send({
      email: "reset@example.com",
      code: "444444",
      newPassword: "newpass123",
    });

    expect(res.body.success).toBe(true);

    const login = await loginUser("reset@example.com", "newpass123");
    expect(login.success).toBe(true);
  });
});

describe("POST /auth/logout", () => {
  it("invalidates refresh token", async () => {
    await createTestUser({ email: "logout@example.com" });
    const login = await loginUser("logout@example.com");

    const res = await request.post("/auth/logout").send({ refreshToken: login.data.refreshToken });
    expect(res.body.success).toBe(true);

    const refresh = await request.post("/auth/refresh-token").send({ refreshToken: login.data.refreshToken });
    expect(refresh.body.success).toBe(false);
  });
});
