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

describe("POST /groups", () => {
  it("creates a group with caller as OWNER", async () => {
    const user = await createTestUser({ email: "creator@example.com" });
    const login = await loginUser("creator@example.com");

    const res = await request
      .post("/groups")
      .set("Authorization", `Bearer ${login.data.accessToken}`)
      .send({ name: "My Group" });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("My Group");

    const membership = await prisma.groupMember.findFirst({
      where: { userId: user.id, groupId: res.body.data.id },
    });
    expect(membership!.role).toBe("OWNER");
  });

  it("rejects empty group name", async () => {
    await createTestUser({ email: "empty@example.com" });
    const login = await loginUser("empty@example.com");

    const res = await request
      .post("/groups")
      .set("Authorization", `Bearer ${login.data.accessToken}`)
      .send({ name: "" });

    expect(res.body.success).toBe(false);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request.post("/groups").send({ name: "No Auth" });
    expect(res.status).toBe(401);
  });
});

describe("GET /groups", () => {
  it("lists only groups the user belongs to", async () => {
    await createTestUser({ email: "u1@example.com" });
    await createTestUser({ email: "u2@example.com" });
    const login1 = await loginUser("u1@example.com");
    const login2 = await loginUser("u2@example.com");

    await request.post("/groups").set("Authorization", `Bearer ${login1.data.accessToken}`).send({ name: "Group A" });
    await request.post("/groups").set("Authorization", `Bearer ${login2.data.accessToken}`).send({ name: "Group B" });

    const res = await request.get("/groups").set("Authorization", `Bearer ${login1.data.accessToken}`);

    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].name).toBe("Group A");
  });
});

describe("GET /groups/:id", () => {
  it("returns group details for members", async () => {
    const { token, groupId } = await setupGroup();

    const res = await request.get(`/groups/${groupId}`).set("Authorization", `Bearer ${token}`);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Test Group");
    expect(res.body.data.members.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects non-members", async () => {
    const { groupId } = await setupGroup();

    await createTestUser({ email: "outsider@example.com" });
    const login = await loginUser("outsider@example.com");

    const res = await request.get(`/groups/${groupId}`).set("Authorization", `Bearer ${login.data.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /groups/:id", () => {
  it("OWNER can update group name", async () => {
    const { token, groupId } = await setupGroup();

    const res = await request
      .put(`/groups/${groupId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed" });

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Renamed");
  });

  it("MEMBER cannot update group name", async () => {
    const { groupId } = await setupGroup();

    const member = await createTestUser({ email: "member@example.com" });
    await prisma.groupMember.create({ data: { userId: member.id, groupId, role: "MEMBER" } });
    const memberLogin = await loginUser("member@example.com");

    const res = await request
      .put(`/groups/${groupId}`)
      .set("Authorization", `Bearer ${memberLogin.data.accessToken}`)
      .send({ name: "Nope" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("DELETE /groups/:id", () => {
  it("OWNER can delete group", async () => {
    const { token, groupId } = await setupGroup();

    const res = await request.delete(`/groups/${groupId}`).set("Authorization", `Bearer ${token}`);
    expect(res.body.success).toBe(true);

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    expect(group).toBeNull();
  });

  it("LEADER cannot delete group", async () => {
    const { groupId } = await setupGroup();

    const leader = await createTestUser({ email: "leader@example.com" });
    await prisma.groupMember.create({ data: { userId: leader.id, groupId, role: "LEADER" } });
    const leaderLogin = await loginUser("leader@example.com");

    const res = await request.delete(`/groups/${groupId}`).set("Authorization", `Bearer ${leaderLogin.data.accessToken}`);
    expect(res.body.success).toBe(false);
  });
});
