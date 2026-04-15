import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { cleanDB, createTestUser, loginUser, request, prisma } from "./setup";

beforeAll(async () => { await prisma.$connect(); });
afterAll(async () => { await prisma.$disconnect(); });
beforeEach(cleanDB);

async function setupGroup() {
  const owner = await createTestUser({ email: "owner@example.com", name: "Owner" });
  const login = await loginUser("owner@example.com");
  const token = login.data.accessToken;

  const createRes = await request.post("/groups").set("Authorization", `Bearer ${token}`).send({ name: "Test Group" });
  const groupId = createRes.body.data.id;

  return { owner, token, groupId };
}

describe("POST /groups/:id/members", () => {
  it("OWNER can add a member by email", async () => {
    const { token, groupId } = await setupGroup();
    const newUser = await createTestUser({ email: "new@example.com" });

    const res = await request
      .post(`/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "new@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(newUser.id);
    expect(res.body.data.role).toBe("MEMBER");
  });

  it("LEADER can add a member", async () => {
    const { groupId } = await setupGroup();

    const leader = await createTestUser({ email: "leader@example.com" });
    await prisma.groupMember.create({ data: { userId: leader.id, groupId, role: "LEADER" } });
    const leaderLogin = await loginUser("leader@example.com");

    await createTestUser({ email: "target@example.com" });

    const res = await request
      .post(`/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${leaderLogin.data.accessToken}`)
      .send({ email: "target@example.com" });

    expect(res.body.success).toBe(true);
  });

  it("MEMBER cannot add members", async () => {
    const { groupId } = await setupGroup();

    const member = await createTestUser({ email: "member@example.com" });
    await prisma.groupMember.create({ data: { userId: member.id, groupId, role: "MEMBER" } });
    const memberLogin = await loginUser("member@example.com");

    await createTestUser({ email: "target@example.com" });

    const res = await request
      .post(`/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${memberLogin.data.accessToken}`)
      .send({ email: "target@example.com" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("rejects adding non-existent user", async () => {
    const { token, groupId } = await setupGroup();

    const res = await request
      .post(`/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "ghost@example.com" });

    expect(res.body.success).toBe(false);
  });

  it("rejects adding duplicate member", async () => {
    const { token, groupId } = await setupGroup();
    await createTestUser({ email: "dup@example.com" });

    await request.post(`/groups/${groupId}/members`).set("Authorization", `Bearer ${token}`).send({ email: "dup@example.com" });
    const res = await request.post(`/groups/${groupId}/members`).set("Authorization", `Bearer ${token}`).send({ email: "dup@example.com" });

    expect(res.body.success).toBe(false);
  });
});

describe("PUT /groups/:id/members/:userId/role", () => {
  it("OWNER can change role to LEADER", async () => {
    const { token, groupId } = await setupGroup();
    const member = await createTestUser({ email: "m@example.com" });
    await prisma.groupMember.create({ data: { userId: member.id, groupId, role: "MEMBER" } });

    const res = await request
      .put(`/groups/${groupId}/members/${member.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "LEADER" });

    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe("LEADER");
  });

  it("LEADER cannot change roles", async () => {
    const { groupId } = await setupGroup();

    const leader = await createTestUser({ email: "leader@example.com" });
    await prisma.groupMember.create({ data: { userId: leader.id, groupId, role: "LEADER" } });
    const leaderLogin = await loginUser("leader@example.com");

    const member = await createTestUser({ email: "m@example.com" });
    await prisma.groupMember.create({ data: { userId: member.id, groupId, role: "MEMBER" } });

    const res = await request
      .put(`/groups/${groupId}/members/${member.id}/role`)
      .set("Authorization", `Bearer ${leaderLogin.data.accessToken}`)
      .send({ role: "LEADER" });

    expect(res.status).toBe(403);
  });

  it("rejects setting role to OWNER", async () => {
    const { token, groupId } = await setupGroup();
    const member = await createTestUser({ email: "m@example.com" });
    await prisma.groupMember.create({ data: { userId: member.id, groupId, role: "MEMBER" } });

    const res = await request
      .put(`/groups/${groupId}/members/${member.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "OWNER" });

    expect(res.body.success).toBe(false);
  });
});

describe("DELETE /groups/:id/members/:userId", () => {
  it("OWNER can remove a member", async () => {
    const { token, groupId } = await setupGroup();
    const member = await createTestUser({ email: "remove@example.com" });
    await prisma.groupMember.create({ data: { userId: member.id, groupId, role: "MEMBER" } });

    const res = await request
      .delete(`/groups/${groupId}/members/${member.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.success).toBe(true);

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: member.id, groupId } },
    });
    expect(membership).toBeNull();
  });

  it("LEADER can remove a member", async () => {
    const { groupId } = await setupGroup();

    const leader = await createTestUser({ email: "leader@example.com" });
    await prisma.groupMember.create({ data: { userId: leader.id, groupId, role: "LEADER" } });
    const leaderLogin = await loginUser("leader@example.com");

    const member = await createTestUser({ email: "m@example.com" });
    await prisma.groupMember.create({ data: { userId: member.id, groupId, role: "MEMBER" } });

    const res = await request
      .delete(`/groups/${groupId}/members/${member.id}`)
      .set("Authorization", `Bearer ${leaderLogin.data.accessToken}`);

    expect(res.body.success).toBe(true);
  });

  it("MEMBER cannot remove others", async () => {
    const { groupId } = await setupGroup();

    const member1 = await createTestUser({ email: "m1@example.com" });
    await prisma.groupMember.create({ data: { userId: member1.id, groupId, role: "MEMBER" } });
    const m1Login = await loginUser("m1@example.com");

    const member2 = await createTestUser({ email: "m2@example.com" });
    await prisma.groupMember.create({ data: { userId: member2.id, groupId, role: "MEMBER" } });

    const res = await request
      .delete(`/groups/${groupId}/members/${member2.id}`)
      .set("Authorization", `Bearer ${m1Login.data.accessToken}`);

    expect(res.status).toBe(403);
  });
});
