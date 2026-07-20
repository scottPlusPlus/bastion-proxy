"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";
import { nanoid } from "nanoid";
import { redirect, unstable_rethrow } from "next/navigation";
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
      apiKeys: {
        create: {
          name: "Default",
          key: generateApiKey(),
          permissions: { create: [{ resource: "ENV", action: "READ" }] },
        },
      },
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

export async function createApiKey(
  projectId: string,
  formData: FormData,
): Promise<{ error: string } | null> {
  try {
    const userId = await requireUserId();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Name is required" };
    if (name.length > 100) return { error: "Name must be 100 characters or less" };

    const project = await prisma.project.findUnique({ where: { id: projectId, userId } });
    if (!project) return { error: "Project not found" };

    const perms: { resource: string; action: string }[] = [];
    if (formData.get("perm_env_read")) perms.push({ resource: "ENV", action: "READ" });
    if (formData.get("perm_env_create")) perms.push({ resource: "ENV", action: "CREATE" });
    if (formData.get("perm_env_update")) perms.push({ resource: "ENV", action: "UPDATE" });
    if (formData.get("perm_env_delete")) perms.push({ resource: "ENV", action: "DELETE" });
    if (perms.length === 0) return { error: "At least one permission is required" };

    await prisma.apiKey.create({
      data: { projectId, name, key: generateApiKey(), permissions: { create: perms } },
    });
    revalidatePath(`/projects/${projectId}`);
    return null;
  } catch (err) {
    unstable_rethrow(err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateApiKeyPermissions(
  keyId: string,
  formData: FormData,
): Promise<{ error: string } | null> {
  try {
    const userId = await requireUserId();

    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
      include: { project: { select: { id: true, userId: true } } },
    });
    if (!apiKey || apiKey.project.userId !== userId) return { error: "Not found" };

    const perms: { resource: string; action: string }[] = [];
    if (formData.get("perm_env_read")) perms.push({ resource: "ENV", action: "READ" });
    if (formData.get("perm_env_create")) perms.push({ resource: "ENV", action: "CREATE" });
    if (formData.get("perm_env_update")) perms.push({ resource: "ENV", action: "UPDATE" });
    if (formData.get("perm_env_delete")) perms.push({ resource: "ENV", action: "DELETE" });
    if (perms.length === 0) return { error: "At least one permission is required" };

    await prisma.$transaction([
      prisma.apiKeyPermission.deleteMany({ where: { apiKeyId: keyId } }),
      prisma.apiKeyPermission.createMany({ data: perms.map((p) => ({ apiKeyId: keyId, ...p })) }),
    ]);

    revalidatePath(`/projects/${apiKey.project.id}`);
    return null;
  } catch (err) {
    unstable_rethrow(err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function regenerateApiKey(keyId: string) {
  const userId = await requireUserId();

  const apiKey = await prisma.apiKey.findUnique({
    where: { id: keyId },
    include: { project: { select: { id: true, userId: true } } },
  });
  if (!apiKey || apiKey.project.userId !== userId) throw new Error("Not found");

  await prisma.apiKey.update({ where: { id: keyId }, data: { key: generateApiKey() } });
  revalidatePath(`/projects/${apiKey.project.id}`);
}

export async function deleteApiKey(keyId: string) {
  const userId = await requireUserId();

  const apiKey = await prisma.apiKey.findUnique({
    where: { id: keyId },
    include: { project: { select: { id: true, userId: true } } },
  });
  if (!apiKey || apiKey.project.userId !== userId) throw new Error("Not found");

  // Keep the count check and deletion in one SQLite statement so concurrent
  // requests cannot both observe two keys and delete the final pair.
  const deleted = await prisma.$executeRaw`
    DELETE FROM "ApiKey"
    WHERE "id" = ${keyId}
      AND "projectId" = ${apiKey.project.id}
      AND EXISTS (
        SELECT 1 FROM "ApiKey" AS "other"
        WHERE "other"."projectId" = "ApiKey"."projectId"
          AND "other"."id" <> "ApiKey"."id"
      )
  `;
  if (deleted === 0) throw new Error("Cannot delete the last API key");

  revalidatePath(`/projects/${apiKey.project.id}`);
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

export async function toggleEnvVarLocked(id: string) {
  const userId = await requireUserId();

  const envVar = await prisma.envVar.findUnique({
    where: { id },
    include: { project: { select: { id: true, userId: true } } },
  });
  if (!envVar || envVar.project.userId !== userId) throw new Error("Not found");

  await prisma.envVar.update({ where: { id }, data: { locked: !envVar.locked } });
  await writeAuditLog({
    action: envVar.locked ? "ENV_VAR_UNLOCK" : "ENV_VAR_LOCK",
    projectId: envVar.project.id,
    envVarKey: envVar.key,
  });
  revalidatePath(`/projects/${envVar.project.id}`);
}

export async function duplicateEnvVars(
  sourceProjectId: string,
  formData: FormData,
): Promise<{ error: string } | null> {
  try {
    const userId = await requireUserId();

    const sourceProject = await prisma.project.findUnique({
      where: { id: sourceProjectId, userId },
      include: { envVars: true },
    });
    if (!sourceProject) return { error: "Source project not found" };

    const targetType = String(formData.get("targetType") ?? "");

    if (targetType === "existing") {
      const targetProjectId = String(formData.get("targetProjectId") ?? "").trim();
      if (!targetProjectId) return { error: "Please select a target project" };
      if (targetProjectId === sourceProjectId) return { error: "Cannot duplicate to the same project" };

      const targetProject = await prisma.project.findUnique({
        where: { id: targetProjectId, userId },
      });
      if (!targetProject) return { error: "Target project not found" };

      if (sourceProject.envVars.length > 0) {
        await prisma.$transaction(
          sourceProject.envVars.map((v) =>
            prisma.envVar.upsert({
              where: { projectId_key: { projectId: targetProjectId, key: v.key } },
              create: { projectId: targetProjectId, key: v.key, value: v.value, isSecret: v.isSecret, locked: v.locked },
              update: { value: v.value, isSecret: v.isSecret, locked: v.locked },
            }),
          ),
        );
      }

      await writeAuditLog({
        action: "ENV_VARS_DUPLICATE",
        projectId: sourceProjectId,
        targetProjectName: targetProject.name,
        varCount: sourceProject.envVars.length,
      });

      revalidatePath(`/projects/${targetProjectId}`);
      return null;
    }

    if (targetType === "new") {
      const newProjectName = String(formData.get("newProjectName") ?? "").trim();
      if (!newProjectName) return { error: "Project name is required" };
      if (newProjectName.length > 100) return { error: "Name must be 100 characters or less" };

      const newProject = await prisma.project.create({
        data: {
          name: newProjectName,
          userId,
          apiKeys: {
            create: {
              name: "Default",
              key: generateApiKey(),
              permissions: { create: [{ resource: "ENV", action: "READ" }] },
            },
          },
          envVars: {
            create: sourceProject.envVars.map((v) => ({
              key: v.key,
              value: v.value,
              isSecret: v.isSecret,
              locked: v.locked,
            })),
          },
        },
      });

      await writeAuditLog({
        action: "ENV_VARS_DUPLICATE",
        projectId: sourceProjectId,
        targetProjectName: newProjectName,
        varCount: sourceProject.envVars.length,
      });

      revalidatePath("/projects");
      redirect(`/projects/${newProject.id}`);
    }

    return { error: "Invalid target type" };
  } catch (err) {
    if ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw err;
    return { error: err instanceof Error ? err.message : String(err) };
  }
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
