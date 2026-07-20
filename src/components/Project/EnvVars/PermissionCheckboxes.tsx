import type { DisplayApiKeyPermission } from "./ApiKeyList";

const PERMISSION_OPTIONS = [
  {
    name: "perm_env_read",
    label: "Proxy (ENV Read)",
    description: "inject env vars into proxied requests",
    defaultChecked: true,
  },
  {
    name: "perm_env_create",
    label: "ENV Create",
    description: "create new environment variables via API",
    defaultChecked: false,
  },
  {
    name: "perm_env_update",
    label: "ENV Update",
    description: "update existing environment variables via API",
    defaultChecked: false,
  },
  {
    name: "perm_env_delete",
    label: "ENV Delete",
    description: "delete environment variables via API",
    defaultChecked: false,
  },
] as const;

const PERM_FIELD_MAP: Record<string, [string, string]> = {
  perm_env_read: ["ENV", "READ"],
  perm_env_create: ["ENV", "CREATE"],
  perm_env_update: ["ENV", "UPDATE"],
  perm_env_delete: ["ENV", "DELETE"],
};

interface Props {
  current?: DisplayApiKeyPermission[];
}

export function PermissionCheckboxes({ current }: Props) {
  return (
    <div className="space-y-1.5">
      {PERMISSION_OPTIONS.map((opt) => {
        const [resource, action] = PERM_FIELD_MAP[opt.name];
        const checked = current
          ? current.some((p) => p.resource === resource && p.action === action)
          : opt.defaultChecked;
        return (
          <label key={opt.name} className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              name={opt.name}
              className="checkbox checkbox-sm mt-0.5"
              defaultChecked={checked}
              key={`${resource}-${action}-${checked}`}
            />
            <span className="text-sm">
              <span className="font-medium">{opt.label}</span>
              <span className="text-base-content/50 ml-1">— {opt.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
