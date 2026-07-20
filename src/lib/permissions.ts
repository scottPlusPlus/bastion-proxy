import type { ApiKeyPermission } from "@prisma/client";

export type PermissionResource = "ENV";
export type PermissionAction = "READ" | "CREATE" | "UPDATE" | "DELETE";

export function hasPermission(
  permissions: Pick<ApiKeyPermission, "resource" | "action">[],
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  return permissions.some((p) => p.resource === resource && p.action === action);
}
