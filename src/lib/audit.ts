import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "ENV_VAR_CREATE"
  | "ENV_VAR_UPDATE"
  | "ENV_VAR_DELETE"
  | "ENV_VAR_LOCK"
  | "ENV_VAR_UNLOCK"
  | "ENV_VARS_DUPLICATE"
  | "PROXY_CALL";

export interface EnvVarAuditParams {
  action: "ENV_VAR_CREATE" | "ENV_VAR_UPDATE" | "ENV_VAR_DELETE" | "ENV_VAR_LOCK" | "ENV_VAR_UNLOCK";
  projectId: string;
  envVarKey: string;
  apiKeyId?: string;
  apiKeyName?: string;
}

export interface DuplicateAuditParams {
  action: "ENV_VARS_DUPLICATE";
  /** Source project (the one the user clicked Duplicate on) */
  projectId: string;
  /** Name of the destination project — stored in envVarKey for display */
  targetProjectName: string;
  varCount: number;
}

export interface ProxyCallAuditParams {
  action: "PROXY_CALL";
  projectId: string;
  apiKeyId: string;
  apiKeyName: string;
  targetUrl: string;
  requestBytes: number | null;
  responseBytes: number | null;
  secretKeys: string[];
}

export type AuditParams = EnvVarAuditParams | DuplicateAuditParams | ProxyCallAuditParams;

export async function writeAuditLog(params: AuditParams): Promise<void> {
  if (params.action === "PROXY_CALL") {
    await prisma.auditLog.create({
      data: {
        projectId: params.projectId,
        action: params.action,
        apiKeyId: params.apiKeyId,
        apiKeyName: params.apiKeyName,
        targetUrl: params.targetUrl,
        requestBytes: params.requestBytes,
        responseBytes: params.responseBytes,
        secretKeys: params.secretKeys.join(","),
      },
    });
  } else if (params.action === "ENV_VARS_DUPLICATE") {
    await prisma.auditLog.create({
      data: {
        projectId: params.projectId,
        action: params.action,
        // Reuse envVarKey to store "{varCount} vars → {targetProjectName}"
        envVarKey: `${params.varCount} vars → ${params.targetProjectName}`,
      },
    });
  } else {
    await prisma.auditLog.create({
      data: {
        projectId: params.projectId,
        action: params.action,
        envVarKey: params.envVarKey,
        apiKeyId: params.apiKeyId,
        apiKeyName: params.apiKeyName,
      },
    });
  }
}
