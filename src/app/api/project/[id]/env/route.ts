import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getProjectFromReq } from "@/lib/proxy/get-project";
import { hasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

// GET /api/project/[id]/env
// Reading env vars via API is intentionally forbidden to prevent secret leakage.
export async function GET() {
  return NextResponse.json(
    { error: "Reading environment variables via the API is not supported. Use the proxy endpoint to inject env vars into requests." },
    { status: 403 },
  );
}

// POST /api/project/[id]/env
// Create a new env var. Requires ENV CREATE permission.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/project/[id]/env">) {
  const { id: projectId } = await ctx.params;

  const project = await getProjectFromReq(req);
  if (!project) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  if (project.id !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasPermission(project.apiKeyPermissions, "ENV", "CREATE")) {
    return NextResponse.json(
      { error: "This API key does not have permission to create environment variables" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { key, value, isSecret } = body as { key?: unknown; value?: unknown; isSecret?: unknown };

  if (typeof key !== "string" || !key.trim()) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return NextResponse.json(
      { error: "key must start with a letter or underscore and contain only letters, digits, and underscores" },
      { status: 400 },
    );
  }
  if (key.length > 100) {
    return NextResponse.json({ error: "key must be 100 characters or less" }, { status: 400 });
  }
  if (typeof value !== "string" || !value) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }
  if (value.length > 10_240) {
    return NextResponse.json({ error: "value must be 10 KB or less" }, { status: 400 });
  }

  let envVar;
  try {
    envVar = await prisma.envVar.create({
      data: { projectId, key, value: encrypt(value), isSecret: isSecret === true },
      select: { id: true, key: true, isSecret: true, locked: true, createdAt: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: `Env var "${key}" already exists. Use PUT to update it.` },
        { status: 409 },
      );
    }
    throw error;
  }

  await writeAuditLog({
    action: "ENV_VAR_CREATE",
    projectId,
    envVarKey: key,
    apiKeyId: project.apiKeyId,
    apiKeyName: project.apiKeyName,
  });

  return NextResponse.json(envVar, { status: 201 });
}
