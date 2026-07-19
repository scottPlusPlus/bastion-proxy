"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuditAction } from "@/lib/audit";

const ACTIONS: { value: AuditAction; label: string }[] = [
  { value: "ENV_VAR_CREATE", label: "Env var created" },
  { value: "ENV_VAR_UPDATE", label: "Env var updated" },
  { value: "ENV_VAR_DELETE", label: "Env var deleted" },
  { value: "PROXY_CALL", label: "Proxy call" },
];

export interface FilterValues {
  q: string;
  action: string;
  from: string;
  to: string;
  reqOp: string;
  req: string;
  resOp: string;
  res: string;
}

interface Props {
  baseUrl: string;
  filters: FilterValues;
}

export function AuditFilters({ baseUrl, filters }: Props) {
  const router = useRouter();
  const isActive = Boolean(
    filters.q ||
      filters.action ||
      filters.from ||
      filters.to ||
      filters.req ||
      filters.res,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qs = new URLSearchParams();

    const append = (key: string) => {
      const val = (fd.get(key) as string).trim();
      if (val) qs.set(key, val);
    };

    append("q");
    append("action");
    append("from");
    append("to");

    const req = (fd.get("req") as string).trim();
    if (req) {
      qs.set("req", req);
      qs.set("reqOp", fd.get("reqOp") as string);
    }

    const res = (fd.get("res") as string).trim();
    if (res) {
      qs.set("res", res);
      qs.set("resOp", fd.get("resOp") as string);
    }

    const search = qs.toString();
    router.push(search ? `${baseUrl}?${search}` : baseUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-base-200 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Key search */}
        <fieldset className="fieldset p-0">
          <legend className="fieldset-legend text-xs">Key name</legend>
          <input
            name="q"
            type="text"
            placeholder="Search key…"
            defaultValue={filters.q}
            className="input input-sm w-full"
          />
        </fieldset>

        {/* Action */}
        <fieldset className="fieldset p-0">
          <legend className="fieldset-legend text-xs">Action</legend>
          <select name="action" defaultValue={filters.action} className="select select-sm w-full">
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </fieldset>

        {/* Date range */}
        <fieldset className="fieldset p-0">
          <legend className="fieldset-legend text-xs">Date range</legend>
          <div className="flex gap-1 items-center">
            <input
              name="from"
              type="date"
              defaultValue={filters.from}
              className="input input-sm flex-1 min-w-0"
            />
            <span className="text-base-content/40 text-xs shrink-0">–</span>
            <input
              name="to"
              type="date"
              defaultValue={filters.to}
              className="input input-sm flex-1 min-w-0"
            />
          </div>
        </fieldset>

        {/* Request bytes */}
        <fieldset className="fieldset p-0">
          <legend className="fieldset-legend text-xs">Request bytes</legend>
          <div className="flex gap-1">
            <select name="reqOp" defaultValue={filters.reqOp} className="select select-sm w-20 shrink-0">
              <option value="gt">&gt;</option>
              <option value="lt">&lt;</option>
            </select>
            <input
              name="req"
              type="number"
              min="0"
              placeholder="bytes"
              defaultValue={filters.req}
              className="input input-sm flex-1 min-w-0"
            />
          </div>
        </fieldset>

        {/* Response bytes */}
        <fieldset className="fieldset p-0">
          <legend className="fieldset-legend text-xs">Response bytes</legend>
          <div className="flex gap-1">
            <select name="resOp" defaultValue={filters.resOp} className="select select-sm w-20 shrink-0">
              <option value="gt">&gt;</option>
              <option value="lt">&lt;</option>
            </select>
            <input
              name="res"
              type="number"
              min="0"
              placeholder="bytes"
              defaultValue={filters.res}
              className="input input-sm flex-1 min-w-0"
            />
          </div>
        </fieldset>

        {/* Actions */}
        <fieldset className="fieldset p-0 justify-end">
          <legend className="fieldset-legend text-xs opacity-0 select-none">.</legend>
          <div className="flex gap-2 items-center">
            <button type="submit" className="btn btn-primary btn-sm">
              Apply
            </button>
            {isActive && (
              <Link href={baseUrl} className="btn btn-ghost btn-sm">
                Clear
              </Link>
            )}
          </div>
        </fieldset>
      </div>
    </form>
  );
}
