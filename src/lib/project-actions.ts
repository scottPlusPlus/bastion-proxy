"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function generateApiKey(): string {
  return `bp_${nanoid(32)}`;
}

// ─── Projects ───────────────────────────────────────────────

export async function createProject(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  if (name.length > 100) throw new Error("Name must be 100 characters or less");

  const project = await prisma.project.create({
    data: {
      name,
      userId,
      apiKey: { create: { key: generateApiKey() } },
    },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function renameProject(id: string, formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  if (name.length > 100) throw new Error("Name must be 100 characters or less");

  await prisma.project.update({
    where: { id, userId },
    data: { name },
  });

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
}

export async function deleteProject(id: string) {
  const userId = await requireUserId();
  await prisma.project.delete({ where: { id, userId } });
  revalidatePath("/projects");
  redirect("/projects");
}

// ─── API Keys ───────────────────────────────────────────────

export async function regenerateApiKey(projectId: string) {
  const userId = await requireUserId();

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Project not found");

  const newKey = generateApiKey();
  await prisma.apiKey.upsert({
    where: { projectId },
    create: { projectId, key: newKey },
    update: { key: newKey },
  });

  revalidatePath(`/projects/${projectId}`);
}

// ─── Env Vars ───────────────────────────────────────────────

export async function upsertEnvVar(
  projectId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  try {
    const userId = await requireUserId();
    const key = String(formData.get("key") ?? "").trim();
    const value = String(formData.get("value") ?? "");
    const isSecret = formData.get("isSecret") === "on";

    if (!key) return { error: "Key is required" };
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
      return { error: "Key must start with a letter or underscore and contain only letters, digits, and underscores" };
    if (key.length > 100) return { error: "Key must be 100 characters or less" };
    if (!value) return { error: "Value is required" };
    if (value.length > 10_240) return { error: "Value must be 10 KB or less" };

    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
    });
    if (!project) return { error: "Project not found" };

    const existing = await prisma.envVar.findUnique({
      where: { projectId_key: { projectId, key } },
      select: { id: true },
    });

    await prisma.envVar.upsert({
      where: { projectId_key: { projectId, key } },
      create: { projectId, key, value: encrypt(value), isSecret },
      update: { value: encrypt(value) }, // preserve existing isSecret on update
    });

    await writeAuditLog({
      action: existing ? "ENV_VAR_UPDATE" : "ENV_VAR_CREATE",
      projectId,
      envVarKey: key,
    });

    revalidatePath(`/projects/${projectId}`);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

export async function updateEnvVarValue(id: string, formData: FormData) {
  const userId = await requireUserId();
  const value = String(formData.get("value") ?? "");
  if (!value) throw new Error("Value is required");
  if (value.length > 10_240) throw new Error("Value must be 10 KB or less");

  const envVar = await prisma.envVar.findUnique({
    where: { id },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!envVar || envVar.project.userId !== userId) throw new Error("Not found");

  await prisma.envVar.update({ where: { id }, data: { value: encrypt(value) } });
  await writeAuditLog({
    action: "ENV_VAR_UPDATE",
    projectId: envVar.project.id,
    envVarKey: envVar.key,
  });
  revalidatePath(`/projects/${envVar.project.id}`);
}

export async function deleteEnvVar(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id"));

  const envVar = await prisma.envVar.findUnique({
    where: { id },
    include: { project: { select: { id: true, userId: true } } },
  });

  if (!envVar || envVar.project.userId !== userId) {
    throw new Error("Not found");
  }

  await prisma.envVar.delete({ where: { id } });
  await writeAuditLog({
    action: "ENV_VAR_DELETE",
    projectId: envVar.project.id,
    envVarKey: envVar.key,
  });
  revalidatePath(`/projects/${envVar.project.id}`);
}
