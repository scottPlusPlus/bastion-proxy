import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import type { NextRequest } from "next/server";

/**
 * Resolves the project from an incoming request's API key.
 * Accepts both x-api-key header and Authorization: Bearer bp_... header.
 * Secret env var values are decrypted before being returned.
 */
export async function getProjectFromReq(req: NextRequest) {
  const header =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^bearer /i, "");

  if (!header?.startsWith("bp_")) return null;

  const record = await prisma.apiKey.findUnique({
    where: { key: header },
    include: { permissions: true, project: { include: { envVars: true } } },
  });

  if (!record?.project) return null;

  return {
    ...record.project,
    apiKeyId: record.id,
    apiKeyName: record.name,
    apiKeyPermissions: record.permissions,
    envVars: record.project.envVars.map((v) => ({
      ...v,
      value: decrypt(v.value),
    })),
  };
}
