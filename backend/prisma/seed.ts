/**
 * Database Seed Script
 *
 * Creates realistic test data so you can immediately test the API.
 *
 * Users (all passwords are "password123"):
 *   - alice@example.com  (Alice Johnson)
 *   - bob@example.com    (Bob Smith)
 *   - charlie@example.com (Charlie Brown)
 *   - diana@example.com  (Diana Prince)
 *   - eve@example.com    (Eve Wilson)
 *
 * Groups:
 *   - "Engineering Team"  → Alice=OWNER, Bob=LEADER, Charlie=MEMBER
 *   - "Design Squad"      → Bob=OWNER, Diana=LEADER, Eve=MEMBER
 *   - "Marketing Hub"     → Charlie=OWNER, Alice=MEMBER
 *
 * Each group has activity logs pre-populated.
 *
 * Run: bun run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "password123";
const SALT_ROUNDS = 12;

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clean existing data
  console.log("  Cleaning existing data...");
  await prisma.log.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oTP.deleteMany();
  await prisma.user.deleteMany();

  // Hash password once (same for all seed users)
  const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // ──────────────── USERS ────────────────
  console.log("  Creating users...");

  const alice = await prisma.user.create({
    data: {
      name: "Alice Johnson",
      email: "alice@example.com",
      password: hashedPassword,
      verified: true,
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: "Bob Smith",
      email: "bob@example.com",
      password: hashedPassword,
      verified: true,
    },
  });

  const charlie = await prisma.user.create({
    data: {
      name: "Charlie Brown",
      email: "charlie@example.com",
      password: hashedPassword,
      verified: true,
    },
  });

  const diana = await prisma.user.create({
    data: {
      name: "Diana Prince",
      email: "diana@example.com",
      password: hashedPassword,
      verified: true,
    },
  });

  const eve = await prisma.user.create({
    data: {
      name: "Eve Wilson",
      email: "eve@example.com",
      password: hashedPassword,
      verified: true,
    },
  });

  // One unverified user (for testing verify-otp flow)
  const frank = await prisma.user.create({
    data: {
      name: "Frank Unverified",
      email: "frank@example.com",
      password: hashedPassword,
      verified: false,
    },
  });

  // OTP for Frank (code: 123456, valid for 10 minutes)
  await prisma.oTP.create({
    data: {
      email: "frank@example.com",
      code: "123456",
      type: "verification",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  console.log(`    ✓ alice@example.com    (verified)`);
  console.log(`    ✓ bob@example.com      (verified)`);
  console.log(`    ✓ charlie@example.com  (verified)`);
  console.log(`    ✓ diana@example.com    (verified)`);
  console.log(`    ✓ eve@example.com      (verified)`);
  console.log(`    ✓ frank@example.com    (unverified, OTP: 123456)`);

  // ──────────────── GROUPS ────────────────
  console.log("\n  Creating groups...");

  // Group 1: Engineering Team
  const engineering = await prisma.group.create({
    data: { name: "Engineering Team" },
  });
  await prisma.groupMember.createMany({
    data: [
      { userId: alice.id, groupId: engineering.id, role: "OWNER" },
      { userId: bob.id, groupId: engineering.id, role: "LEADER" },
      { userId: charlie.id, groupId: engineering.id, role: "MEMBER" },
    ],
  });

  // Group 2: Design Squad
  const design = await prisma.group.create({
    data: { name: "Design Squad" },
  });
  await prisma.groupMember.createMany({
    data: [
      { userId: bob.id, groupId: design.id, role: "OWNER" },
      { userId: diana.id, groupId: design.id, role: "LEADER" },
      { userId: eve.id, groupId: design.id, role: "MEMBER" },
    ],
  });

  // Group 3: Marketing Hub
  const marketing = await prisma.group.create({
    data: { name: "Marketing Hub" },
  });
  await prisma.groupMember.createMany({
    data: [
      { userId: charlie.id, groupId: marketing.id, role: "OWNER" },
      { userId: alice.id, groupId: marketing.id, role: "MEMBER" },
    ],
  });

  console.log(`    ✓ Engineering Team  (Alice=OWNER, Bob=LEADER, Charlie=MEMBER)`);
  console.log(`    ✓ Design Squad      (Bob=OWNER, Diana=LEADER, Eve=MEMBER)`);
  console.log(`    ✓ Marketing Hub     (Charlie=OWNER, Alice=MEMBER)`);

  // ──────────────── LOGS ────────────────
  console.log("\n  Creating activity logs...");

  // Engineering Team logs
  const engineeringLogs = [
    { action: "GROUP_CREATED", message: 'Group "Engineering Team" created', performedBy: alice.id },
    { action: "MEMBER_ADDED", message: "Bob Smith added to group", performedBy: alice.id, targetUserId: bob.id },
    { action: "ROLE_UPDATED", message: "Bob Smith role changed to LEADER", performedBy: alice.id, targetUserId: bob.id },
    { action: "MEMBER_ADDED", message: "Charlie Brown added to group", performedBy: bob.id, targetUserId: charlie.id },
    { action: "GROUP_UPDATED", message: 'Group renamed to "Engineering Team"', performedBy: alice.id },
  ];
  for (let i = 0; i < engineeringLogs.length; i++) {
    await prisma.log.create({
      data: {
        groupId: engineering.id,
        ...engineeringLogs[i]!,
        createdAt: new Date(Date.now() - (engineeringLogs.length - i) * 60 * 60 * 1000),
      },
    });
  }

  // Design Squad logs
  const designLogs = [
    { action: "GROUP_CREATED", message: 'Group "Design Squad" created', performedBy: bob.id },
    { action: "MEMBER_ADDED", message: "Diana Prince added to group", performedBy: bob.id, targetUserId: diana.id },
    { action: "ROLE_UPDATED", message: "Diana Prince role changed to LEADER", performedBy: bob.id, targetUserId: diana.id },
    { action: "MEMBER_ADDED", message: "Eve Wilson added to group", performedBy: diana.id, targetUserId: eve.id },
  ];
  for (let i = 0; i < designLogs.length; i++) {
    await prisma.log.create({
      data: {
        groupId: design.id,
        ...designLogs[i]!,
        createdAt: new Date(Date.now() - (designLogs.length - i) * 30 * 60 * 1000),
      },
    });
  }

  // Marketing Hub logs
  const marketingLogs = [
    { action: "GROUP_CREATED", message: 'Group "Marketing Hub" created', performedBy: charlie.id },
    { action: "MEMBER_ADDED", message: "Alice Johnson added to group", performedBy: charlie.id, targetUserId: alice.id },
  ];
  for (let i = 0; i < marketingLogs.length; i++) {
    await prisma.log.create({
      data: {
        groupId: marketing.id,
        ...marketingLogs[i]!,
        createdAt: new Date(Date.now() - (marketingLogs.length - i) * 15 * 60 * 1000),
      },
    });
  }

  console.log(`    ✓ 5 logs for Engineering Team`);
  console.log(`    ✓ 4 logs for Design Squad`);
  console.log(`    ✓ 2 logs for Marketing Hub`);

  // ──────────────── SUMMARY ────────────────
  console.log("\n✅ Seed complete!\n");
  console.log("  Login credentials (all users):");
  console.log("  Password: password123\n");
  console.log("  Test accounts:");
  console.log("  ┌─────────────────────────┬────────────────────┐");
  console.log("  │ Email                   │ Status             │");
  console.log("  ├─────────────────────────┼────────────────────┤");
  console.log("  │ alice@example.com       │ verified           │");
  console.log("  │ bob@example.com         │ verified           │");
  console.log("  │ charlie@example.com     │ verified           │");
  console.log("  │ diana@example.com       │ verified           │");
  console.log("  │ eve@example.com         │ verified           │");
  console.log("  │ frank@example.com       │ unverified (123456)│");
  console.log("  └─────────────────────────┴────────────────────┘");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
