import { describe, test, expect } from "vitest";
import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { PUT, DELETE } from "./route";

async function seed(permissions: { resource: string; action: string }[]) {
  const user = await prisma.user.create({ data: { email: `u-${nanoid(6)}@test.com` } });
  const project = await prisma.project.create({ data: { name: "P", userId: user.id } });
  const apiKey = `bp_${nanoid(32)}`;
  await prisma.apiKey.create({
    data: { projectId: project.id, name: "K", key: apiKey, permissions: { create: permissions } },
  });
  return { projectId: project.id, apiKey };
}

async function seedVar(projectId: string, key: string, opts: { locked?: boolean } = {}) {
  return prisma.envVar.create({
    data: { projectId, key, value: encrypt("original"), isSecret: false, locked: opts.locked ?? false },
  });
}

function putReq(projectId: string, key: string, body: unknown, apiKey?: string) {
  return new NextRequest(`http://localhost/api/project/${projectId}/env/${key}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

function delReq(projectId: string, key: string, apiKey?: string) {
  return new NextRequest(`http://localhost/api/project/${projectId}/env/${key}`, {
    method: "DELETE",
    headers: apiKey ? { "x-api-key": apiKey } : {},
  });
}

function putCtx(projectId: string, key: string) {
  return { params: Promise.resolve({ id: projectId, key }) } as Parameters<typeof PUT>[1];
}

function delCtx(projectId: string, key: string) {
  return { params: Promise.resolve({ id: projectId, key }) } as Parameters<typeof DELETE>[1];
}

// ─── PUT ─────────────────────────────────────────────────────

describe("PUT /api/project/[id]/env/[key]", () => {
  test("401 — missing or invalid API key", async () => {
    const { projectId } = await seed([{ resource: "ENV", action: "UPDATE" }]);
    await seedVar(projectId, "MY_VAR");
    const res = await PUT(putReq(projectId, "MY_VAR", { value: "new" }), putCtx(projectId, "MY_VAR"));
    expect(res.status).toBe(401);
  });

  test("403 — API key belongs to a different project", async () => {
    const { apiKey } = await seed([{ resource: "ENV", action: "UPDATE" }]);
    const otherUser = await prisma.user.create({ data: { email: `o-${nanoid(6)}@test.com` } });
    const otherProject = await prisma.project.create({ data: { name: "Other", userId: otherUser.id } });
    await seedVar(otherProject.id, "MY_VAR");

    const res = await PUT(putReq(otherProject.id, "MY_VAR", { value: "new" }, apiKey), putCtx(otherProject.id, "MY_VAR"));
    expect(res.status).toBe(403);
  });

  test("403 — API key lacks ENV UPDATE permission", async () => {
    const { projectId, apiKey } = await seed([{ resource: "ENV", action: "READ" }]);
    await seedVar(projectId, "MY_VAR");
    const res = await PUT(putReq(projectId, "MY_VAR", { value: "new" }, apiKey), putCtx(projectId, "MY_VAR"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/permission/i);
  });

  test("404 — env var key does not exist", async () => {
    const { projectId, apiKey } = await seed([{ resource: "ENV", action: "UPDATE" }]);
    const res = await PUT(putReq(projectId, "GHOST", { value: "new" }, apiKey), putCtx(projectId, "GHOST"));
    expect(res.status).toBe(404);
  });

  test("423 — env var is locked", async () => {
    const { projectId, apiKey } = await seed([{ resource: "ENV", action: "UPDATE" }]);
    await seedVar(projectId, "MY_VAR", { locked: true });
    const res = await PUT(putReq(projectId, "MY_VAR", { value: "new" }, apiKey), putCtx(projectId, "MY_VAR"));
    expect(res.status).toBe(423);
    expect((await res.json()).error).toMatch(/locked/i);
  });

  test("400 — missing value", async () => {
    const { projectId, apiKey } = await seed([{ resource: "ENV", action: "UPDATE" }]);
    await seedVar(projectId, "MY_VAR");
    const res = await PUT(putReq(projectId, "MY_VAR", {}, apiKey), putCtx(projectId, "MY_VAR"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/value/i);
  });

  test("200 — updates the value", async () => {
    const { projectId, apiKey } = await seed([{ resource: "ENV", action: "UPDATE" }]);
    await seedVar(projectId, "MY_VAR");

    const res = await PUT(putReq(projectId, "MY_VAR", { value: "updated" }, apiKey), putCtx(projectId, "MY_VAR"));
    expect(res.status).toBe(200);
    expect((await res.json()).updated).toBe(true);

    const stored = await prisma.envVar.findUnique({ where: { projectId_key: { projectId, key: "MY_VAR" } } });
    expect(stored!.value).not.toBe(encrypt("original")); // value changed
  });
});

// ─── DELETE ──────────────────────────────────────────────────

describe("DELETE /api/project/[id]/env/[key]", () => {
  test("401 — missing or invalid API key", async () => {
    const { projectId } = await seed([{ resource: "ENV", action: "DELETE" }]);
    await seedVar(projectId, "MY_VAR");
    const res = await DELETE(delReq(projectId, "MY_VAR"), delCtx(projectId, "MY_VAR"));
    expect(res.status).toBe(401);
  });

  test("403 — API key belongs to a different project", async () => {
    const { apiKey } = await seed([{ resource: "ENV", action: "DELETE" }]);
    const otherUser = await prisma.user.create({ data: { email: `o-${nanoid(6)}@test.com` } });
    const otherProject = await prisma.project.create({ data: { name: "Other", userId: otherUser.id } });
    await seedVar(otherProject.id, "MY_VAR");

    const res = await DELETE(delReq(otherProject.id, "MY_VAR", apiKey), delCtx(otherProject.id, "MY_VAR"));
    expect(res.status).toBe(403);
  });

  test("403 — API key lacks ENV DELETE permission", async () => {
    const { projectId, apiKey } = await seed([{ resource: "ENV", action: "READ" }]);
    await seedVar(projectId, "MY_VAR");
    const res = await DELETE(delReq(projectId, "MY_VAR", apiKey), delCtx(projectId, "MY_VAR"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/permission/i);
  });

  test("404 — env var key does not exist", async () => {
    const { projectId, apiKey } = await seed([{ resource: "ENV", action: "DELETE" }]);
    const res = await DELETE(delReq(projectId, "GHOST", apiKey), delCtx(projectId, "GHOST"));
    expect(res.status).toBe(404);
  });

  test("423 — env var is locked", async () => {
    const { projectId, apiKey } = await seed([{ resource: "ENV", action: "DELETE" }]);
    await seedVar(projectId, "MY_VAR", { locked: true });
    const res = await DELETE(delReq(projectId, "MY_VAR", apiKey), delCtx(projectId, "MY_VAR"));
    expect(res.status).toBe(423);
    expect((await res.json()).error).toMatch(/locked/i);
  });

  test("204 — deletes the env var", async () => {
    const { projectId, apiKey } = await seed([{ resource: "ENV", action: "DELETE" }]);
    await seedVar(projectId, "MY_VAR");

    const res = await DELETE(delReq(projectId, "MY_VAR", apiKey), delCtx(projectId, "MY_VAR"));
    expect(res.status).toBe(204);

    const gone = await prisma.envVar.findUnique({ where: { projectId_key: { projectId, key: "MY_VAR" } } });
    expect(gone).toBeNull();
  });
});
