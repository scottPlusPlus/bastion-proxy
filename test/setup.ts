import { beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

beforeEach(async () => {
  // Single transaction — one round-trip, children before parents
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.apiKeyPermission.deleteMany(),
    prisma.envVar.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.project.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});
