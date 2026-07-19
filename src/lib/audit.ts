import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "ENV_VAR_CREATE"
  | "ENV_VAR_UPDATE"
  | "ENV_VAR_DELETE"
  | "PROXY_CALL";

export interface EnvVarAuditParams {
  action: "ENV_VAR_CREATE" | "ENV_VAR_UPDATE" | "ENV_VAR_DELETE";
  projectId: string;
  envVarKey: string;
}

export interface ProxyCallAuditParams {
  action: "PROXY_CALL";
  projectId: string;
  targetUrl: string;
  requestBytes: number | null;
  responseBytes: number | null;
  secretKeys: string[];
}

export type AuditParams = EnvVarAuditParams | ProxyCallAuditParams;

export async function writeAuditLog(params: AuditParams): Promise<void> {
  if (params.action === "PROXY_CALL") {
    await prisma.auditLog.create({
      data: {
        projectId: params.projectId,
        action: params.action,
        targetUrl: params.targetUrl,
        requestBytes: params.requestBytes,
        responseBytes: params.responseBytes,
        secretKeys: params.secretKeys.join(","),
      },
    });
  } else {
    await prisma.auditLog.create({
      data: {
        projectId: params.projectId,
        action: params.action,
        envVarKey: params.envVarKey,
      },
    });
  }
}
