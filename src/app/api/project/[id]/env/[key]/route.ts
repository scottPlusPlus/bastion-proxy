import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getProjectFromReq } from "@/lib/proxy/get-project";
import { hasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

// PUT /api/project/[id]/env/[key]
// Update an env var's value by key name. Requires ENV UPDATE permission. Locked vars cannot be updated.
export async function PUT(
  req: NextRequest,
  ctx: RouteContext<"/api/project/[id]/env/[key]">,
) {
  const { id: projectId, key } = await ctx.params;

  const project = await getProjectFromReq(req);
  if (!project) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  if (project.id !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasPermission(project.apiKeyPermissions, "ENV", "UPDATE")) {
    return NextResponse.json(
      { error: "This API key does not have permission to update environment variables" },
      { status: 403 },
    );
  }

  const envVar = await prisma.envVar.findUnique({
    where: { projectId_key: { projectId, key } },
    select: { id: true, key: true, projectId: true, locked: true },
  });
  if (!envVar) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (envVar.locked) {
    return NextResponse.json(
      { error: `Env var "${key}" is locked and cannot be modified via the API` },
      { status: 423 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { value } = body as { value?: unknown };
  if (typeof value !== "string" || !value) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }
  if (value.length > 10_240) {
    return NextResponse.json({ error: "value must be 10 KB or less" }, { status: 400 });
  }

  // Use id + locked:false in the atomic write to guard against a concurrent lock
  const updated = await prisma.envVar.updateMany({
    where: { id: envVar.id, locked: false },
    data: { value: encrypt(value) },
  });
  if (updated.count === 0) {
    return NextResponse.json(
      { error: `Env var "${key}" is locked and cannot be modified via the API` },
      { status: 423 },
    );
  }

  await writeAuditLog({
    action: "ENV_VAR_UPDATE",
    projectId,
    envVarKey: key,
    apiKeyId: project.apiKeyId,
    apiKeyName: project.apiKeyName,
  });

  return NextResponse.json({ key, updated: true });
}

// DELETE /api/project/[id]/env/[key]
// Delete an env var by key name. Requires ENV DELETE permission. Locked vars cannot be deleted.
export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/project/[id]/env/[key]">,
) {
  const { id: projectId, key } = await ctx.params;

  const project = await getProjectFromReq(req);
  if (!project) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  if (project.id !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasPermission(project.apiKeyPermissions, "ENV", "DELETE")) {
    return NextResponse.json(
      { error: "This API key does not have permission to delete environment variables" },
      { status: 403 },
    );
  }

  const envVar = await prisma.envVar.findUnique({
    where: { projectId_key: { projectId, key } },
    select: { id: true, key: true, projectId: true, locked: true },
  });
  if (!envVar) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (envVar.locked) {
    return NextResponse.json(
      { error: `Env var "${key}" is locked and cannot be deleted via the API` },
      { status: 423 },
    );
  }

  // Use id + locked:false in the atomic delete to guard against a concurrent lock
  const deleted = await prisma.envVar.deleteMany({
    where: { id: envVar.id, locked: false },
  });
  if (deleted.count === 0) {
    return NextResponse.json(
      { error: `Env var "${key}" is locked and cannot be deleted via the API` },
      { status: 423 },
    );
  }

  await writeAuditLog({
    action: "ENV_VAR_DELETE",
    projectId,
    envVarKey: key,
    apiKeyId: project.apiKeyId,
    apiKeyName: project.apiKeyName,
  });

  return new NextResponse(null, { status: 204 });
}
