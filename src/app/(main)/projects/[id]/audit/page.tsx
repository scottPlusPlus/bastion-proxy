import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AuditTable } from "@/components/Project/Audit/AuditTable";
import { AuditFilters, type FilterValues } from "@/components/Project/Audit/AuditFilters";

const PAGE_SIZE = 15;

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    action?: string;
    apiKey?: string;
    from?: string;
    to?: string;
    reqOp?: string;
    req?: string;
    resOp?: string;
    res?: string;
  }>;
}

export default async function AuditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, userId: session.user.id },
    select: { id: true, name: true, apiKeys: { select: { id: true, name: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!project) notFound();

  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);

  const filters: FilterValues = {
    q: sp.q ?? "",
    action: sp.action ?? "",
    apiKey: sp.apiKey ?? "",
    from: sp.from ?? "",
    to: sp.to ?? "",
    reqOp: sp.reqOp ?? "gt",
    req: sp.req ?? "",
    resOp: sp.resOp ?? "gt",
    res: sp.res ?? "",
  };

  // ─── Build where clause ────────────────────────────────────
  const where: Prisma.AuditLogWhereInput = { projectId: id };

  if (filters.q) {
    where.OR = [
      { envVarKey: { contains: filters.q } },
      { secretKeys: { contains: filters.q } },
    ];
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.apiKey) {
    where.apiKeyId = filters.apiKey;
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from + "T00:00:00");
    if (filters.to) where.createdAt.lte = new Date(filters.to + "T23:59:59");
  }

  const reqBytes = parseInt(filters.req);
  if (filters.req && !isNaN(reqBytes)) {
    where.requestBytes = filters.reqOp === "lt" ? { lt: reqBytes } : { gt: reqBytes };
  }

  const resBytes = parseInt(filters.res);
  if (filters.res && !isNaN(resBytes)) {
    where.responseBytes = filters.resOp === "lt" ? { lt: resBytes } : { gt: resBytes };
  }

  // ─── Query ─────────────────────────────────────────────────
  const [total, logs, historicalApiKeys] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.findMany({
      where: { projectId: id, apiKeyId: { not: null } },
      select: { apiKeyId: true, apiKeyName: true },
      distinct: ["apiKeyId"],
    }),
  ]);

  const apiKeys = [...project.apiKeys];
  const currentIds = new Set(apiKeys.map((key) => key.id));
  for (const key of historicalApiKeys) {
    if (key.apiKeyId && !currentIds.has(key.apiKeyId)) {
      apiKeys.push({ id: key.apiKeyId, name: key.apiKeyName ?? "Deleted key" });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function getPageNumbers(current: number, last: number): (number | "...")[] {
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    const lo = Math.max(2, current - 2);
    const hi = Math.min(last - 1, current + 2);
    if (lo > 2) pages.push("...");
    for (let p = lo; p <= hi; p++) pages.push(p);
    if (hi < last - 1) pages.push("...");
    pages.push(last);
    return pages;
  }

  // Preserve filters in pagination links
  const filterParams = new URLSearchParams(
    Object.entries({ ...filters, reqOp: filters.reqOp, resOp: filters.resOp }).filter(
      ([, v]) => v !== "",
    ),
  ).toString();
  const href = (p: number) => {
    const qs = new URLSearchParams(filterParams);
    qs.set("page", String(p));
    return `/projects/${id}/audit?${qs.toString()}`;
  };

  const baseUrl = `/projects/${id}/audit`;

  return (
    <div className="max-w-5xl w-full mx-auto p-6 space-y-6">
      <Breadcrumbs
        crumbs={[
          { label: "Projects", href: "/projects" },
          { label: project.name, href: `/projects/${id}` },
          { label: "Audit Log" },
        ]}
      />

      <h1 className="text-2xl font-bold">Audit Log</h1>

      <AuditFilters baseUrl={baseUrl} filters={filters} apiKeys={apiKeys} />

      <AuditTable logs={logs} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-base-content/50">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="join">
            <Link
              href={href(page - 1)}
              aria-disabled={page <= 1}
              className={`join-item btn btn-sm ${page <= 1 ? "btn-disabled" : ""}`}
            >
              «
            </Link>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="join-item btn btn-sm btn-disabled">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={href(p)}
                  className={`join-item btn btn-sm ${p === page ? "btn-active" : ""}`}
                >
                  {p}
                </Link>
              ),
            )}
            <Link
              href={href(page + 1)}
              aria-disabled={page >= totalPages}
              className={`join-item btn btn-sm ${page >= totalPages ? "btn-disabled" : ""}`}
            >
              »
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
