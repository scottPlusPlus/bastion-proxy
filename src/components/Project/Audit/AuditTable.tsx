"use client";

import { useState } from "react";
import type { AuditAction } from "@/lib/audit";
import { LocalTime } from "@/components/LocalTime";
import { Tooltip } from "@/components/Tooltip";

export interface AuditLogRow {
  id: string;
  action: string;
  envVarKey: string | null;
  apiKeyName: string | null;
  targetUrl: string | null;
  requestBytes: number | null;
  responseBytes: number | null;
  secretKeys: string | null;
  createdAt: Date;
}

interface Props {
  logs: AuditLogRow[];
}

export function AuditTable({ logs }: Props) {
  if (logs.length === 0) {
    return <p className="text-base-content/60 text-sm">No audit events yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table w-full text-sm">
        <thead>
          <tr>
            <th className="w-40 shrink-0">Timestamp</th>
            <th className="w-36 shrink-0">Action</th>
            <th className="w-28 shrink-0">API Key</th>
            <th className="w-44 shrink-0">Keys</th>
            <th className="min-w-0">Details</th>
            <th className="w-24 shrink-0 text-right">Req</th>
            <th className="w-24 shrink-0 text-right">Res</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="hover">
              <td className="font-mono text-xs text-base-content/60">
                <LocalTime date={log.createdAt} />
              </td>
              <td>
                <ActionBadge action={log.action as AuditAction} />
              </td>
              <td className="text-sm">
                {log.apiKeyName ? (
                  <span className="badge badge-ghost badge-sm font-mono">{log.apiKeyName}</span>
                ) : (
                  <span className="text-base-content/30">—</span>
                )}
              </td>
              <td>
                <Keys log={log} />
              </td>
              <td className="font-mono text-xs max-w-0">
                <Details log={log} />
              </td>
              <td className="text-right font-mono text-xs text-base-content/60">
                {log.requestBytes != null ? fmtBytes(log.requestBytes) : "—"}
              </td>
              <td className="text-right font-mono text-xs text-base-content/60">
                {log.responseBytes != null ? fmtBytes(log.responseBytes) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

const ACTION_STYLES: Record<AuditAction, string> = {
  ENV_VAR_CREATE: "badge-success",
  ENV_VAR_UPDATE: "badge-warning",
  ENV_VAR_DELETE: "badge-error",
  ENV_VAR_LOCK: "badge-neutral",
  ENV_VAR_UNLOCK: "badge-neutral",
  ENV_VARS_DUPLICATE: "badge-secondary",
  PROXY_CALL: "badge-info",
};

const ACTION_LABELS: Record<AuditAction, string> = {
  ENV_VAR_CREATE: "Env var created",
  ENV_VAR_UPDATE: "Env var updated",
  ENV_VAR_DELETE: "Env var deleted",
  ENV_VAR_LOCK: "Var locked",
  ENV_VAR_UNLOCK: "Var unlocked",
  ENV_VARS_DUPLICATE: "Vars duplicated",
  PROXY_CALL: "Proxy call",
};

function ActionBadge({ action }: { action: AuditAction }) {
  return (
    <span className={`badge badge-sm ${ACTION_STYLES[action] ?? "badge-ghost"}`}>
      {ACTION_LABELS[action] ?? action}
    </span>
  );
}

function Details({ log }: { log: AuditLogRow }) {
  const [copied, setCopied] = useState(false);

  if (log.action !== "PROXY_CALL" || !log.targetUrl) {
    return <span className="text-base-content/30">—</span>;
  }

  const url = log.targetUrl;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Tooltip
      content={
        <span className="block max-w-xs space-y-1">
          <span className="font-mono break-all block">{url}</span>
          <span className="block text-neutral-content/50">Click to copy</span>
        </span>
      }
      placement="top"
    >
      <span
        onClick={handleCopy}
        className="block truncate text-base-content cursor-pointer hover:text-primary transition-colors"
      >
        {copied ? "Copied!" : url}
      </span>
    </Tooltip>
  );
}

function Keys({ log }: { log: AuditLogRow }) {
  const keys: string[] =
    log.action === "PROXY_CALL"
      ? (log.secretKeys?.split(",").filter(Boolean) ?? [])
      : log.envVarKey
        ? [log.envVarKey]
        : [];

  if (keys.length === 0) return <span className="text-base-content/30">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((k) => (
        <span key={k} className="badge badge-ghost badge-sm font-mono">
          {k}
        </span>
      ))}
    </div>
  );
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
