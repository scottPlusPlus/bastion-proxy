import { describe, test, expect } from "vitest";
import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "./route";

async function seed(permissions: { resource: string; action: string }[]) {
  const user = await prisma.user.create({ data: { email: `u-${nanoid(6)}@test.com` } });
  const project = await prisma.project.create({ data: { name: "P", userId: user.id } });
  const key = `bp_${nanoid(32)}`;
  await prisma.apiKey.create({
    data: { projectId: project.id, name: "K", key, permissions: { create: permissions } },
  });
  return { projectId: project.id, key };
}

function req(projectId: string, body: unknown, apiKey?: string) {
  return new NextRequest(`http://localhost/api/project/${projectId}/env`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

function ctx(projectId: string) {
  return { params: Promise.resolve({ id: projectId }) } as Parameters<typeof POST>[1];
}

// ─── GET ─────────────────────────────────────────────────────

describe("GET /api/project/[id]/env", () => {
  test("always 403 — reading via API is intentionally blocked", async () => {
    const res = await GET();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/not supported/i);
  });
});

// ─── POST ────────────────────────────────────────────────────

describe("POST /api/project/[id]/env", () => {
  test("401 — missing or invalid API key", async () => {
    const { projectId } = await seed([{ resource: "ENV", action: "CREATE" }]);
    const res = await POST(req(projectId, { key: "FOO", value: "bar" }), ctx(projectId));
    expect(res.status).toBe(401);
  });

  test("403 — API key belongs to a different project", async () => {
    const { key } = await seed([{ resource: "ENV", action: "CREATE" }]);
    const otherUser = await prisma.user.create({ data: { email: `o-${nanoid(6)}@test.com` } });
    const otherProject = await prisma.project.create({ data: { name: "Other", userId: otherUser.id } });

    const res = await POST(req(otherProject.id, { key: "FOO", value: "bar" }, key), ctx(otherProject.id));
    expect(res.status).toBe(403);
  });

  test("403 — API key lacks ENV CREATE permission", async () => {
    const { projectId, key } = await seed([{ resource: "ENV", action: "READ" }]);
    const res = await POST(req(projectId, { key: "FOO", value: "bar" }, key), ctx(projectId));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/permission/i);
  });

  test("400 — missing key field", async () => {
    const { projectId, key } = await seed([{ resource: "ENV", action: "CREATE" }]);
    const res = await POST(req(projectId, { value: "bar" }, key), ctx(projectId));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/key/i);
  });

  test("400 — key with invalid format", async () => {
    const { projectId, key } = await seed([{ resource: "ENV", action: "CREATE" }]);
    const res = await POST(req(projectId, { key: "123BAD", value: "bar" }, key), ctx(projectId));
    expect(res.status).toBe(400);
  });

  test("400 — missing value", async () => {
    const { projectId, key } = await seed([{ resource: "ENV", action: "CREATE" }]);
    const res = await POST(req(projectId, { key: "MY_VAR" }, key), ctx(projectId));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/value/i);
  });

  test("400 — body is not valid JSON", async () => {
    const { projectId, key } = await seed([{ resource: "ENV", action: "CREATE" }]);
    const r = new NextRequest(`http://localhost/api/project/${projectId}/env`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: "not-json",
    });
    const res = await POST(r, ctx(projectId));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/json/i);
  });

  test("409 — env var key already exists", async () => {
    const { projectId, key } = await seed([{ resource: "ENV", action: "CREATE" }]);
    await prisma.envVar.create({ data: { projectId, key: "MY_VAR", value: "x", isSecret: false, locked: false } });

    const res = await POST(req(projectId, { key: "MY_VAR", value: "new" }, key), ctx(projectId));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already exists/i);
  });

  test("201 — creates and returns the env var", async () => {
    const { projectId, key } = await seed([{ resource: "ENV", action: "CREATE" }]);
    const res = await POST(req(projectId, { key: "MY_VAR", value: "hello" }, key), ctx(projectId));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.key).toBe("MY_VAR");
    expect(body.id).toBeDefined();

    const stored = await prisma.envVar.findUnique({ where: { projectId_key: { projectId, key: "MY_VAR" } } });
    expect(stored).not.toBeNull();
    expect(stored!.value).not.toBe("hello"); // encrypted at rest
  });

  test("201 — isSecret flag is persisted", async () => {
    const { projectId, key } = await seed([{ resource: "ENV", action: "CREATE" }]);
    await POST(req(projectId, { key: "S_VAR", value: "secret", isSecret: true }, key), ctx(projectId));

    const stored = await prisma.envVar.findUnique({ where: { projectId_key: { projectId, key: "S_VAR" } } });
    expect(stored!.isSecret).toBe(true);
  });
});
