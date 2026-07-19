import type { AuditAction } from "@/lib/audit";
import { LocalTime } from "@/components/LocalTime";

export interface AuditLogRow {
  id: string;
  action: string;
  envVarKey: string | null;
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
            <th className="w-40">Timestamp</th>
            <th className="w-44">Action</th>
            <th className="w-48">Keys</th>
            <th>Details</th>
            <th className="w-28 text-right">Req bytes</th>
            <th className="w-28 text-right">Res bytes</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="hover">
              <td className="font-mono text-xs text-base-content/60 whitespace-nowrap">
                <LocalTime date={log.createdAt} />
              </td>
              <td>
                <ActionBadge action={log.action as AuditAction} />
              </td>
              <td>
                <Keys log={log} />
              </td>
              <td className="font-mono text-xs break-all">
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
  PROXY_CALL: "badge-info",
};

const ACTION_LABELS: Record<AuditAction, string> = {
  ENV_VAR_CREATE: "Env var created",
  ENV_VAR_UPDATE: "Env var updated",
  ENV_VAR_DELETE: "Env var deleted",
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
  if (log.action === "PROXY_CALL") {
    return <span className="text-base-content break-all">{log.targetUrl}</span>;
  }

  return <span className="text-base-content/30">—</span>;
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
