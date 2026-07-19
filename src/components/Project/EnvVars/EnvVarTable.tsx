"use client";

import { useActionState, useRef, useState } from "react";
import { deleteEnvVar, updateEnvVarValue } from "@/lib/project-actions";
import { Tooltip } from "@/components/Tooltip";

export interface DisplayEnvVar {
  id: string;
  key: string;
  /** null when isSecret=true — value is never sent to client */
  value: string | null;
  isSecret: boolean;
}

interface Props {
  envVars: DisplayEnvVar[];
  upsertAction: (
    prevState: { error: string } | null,
    formData: FormData,
  ) => Promise<{ error: string } | null>;
}

export function EnvVarTable({ envVars, upsertAction }: Props) {
  const [pending, setPending] = useState<DisplayEnvVar | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [addState, addFormAction] = useActionState(upsertAction, null);

  const visibleVars = envVars.filter((v) => !v.isSecret);
  const secretCount = envVars.length - visibleVars.length;

  function openDelete(v: DisplayEnvVar) {
    setPending(v);
    dialogRef.current?.showModal();
  }

  function handleCopyAll() {
    const text = visibleVars.map((v) => `${v.key}=${v.value}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  return (
    <>
      <div className="space-y-4">
        {envVars.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              {secretCount > 0 && (
                <span className="text-xs text-base-content/50">
                  {secretCount} secret{secretCount > 1 ? "s" : ""} excluded from copy
                </span>
              )}
              {visibleVars.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs ml-auto"
                  onClick={handleCopyAll}
                >
                  {copiedAll ? "Copied!" : "Copy all"}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full table-fixed">
                <thead>
                  <tr>
                    <th className="w-1/3">Key</th>
                    <th className="w-1/2">Value</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {envVars.map((v) =>
                    editingId === v.id ? (
                      <EditRow
                        key={v.id}
                        envVar={v}
                        onDone={() => setEditingId(null)}
                      />
                    ) : (
                      <tr key={v.id}>
                        <td>
                          <ClickToCopy text={v.key} className="font-mono text-sm" />
                        </td>
                        <td className="font-mono text-sm max-w-xs">
                          <div className="truncate">
                            {v.isSecret ? (
                              <span className="flex items-center gap-1.5 text-base-content/50">
                                <LockIcon />
                                Secret
                              </span>
                            ) : (
                              <ClickToCopy
                                text={v.value!}
                                display={mask(v.value!)}
                                className="text-base-content/70"
                              />
                            )}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex gap-1 justify-end">
                            {!v.isSecret && (
                              <CopyButton
                                text={`${v.key}=${v.value}`}
                                label="Copy"
                                className="btn btn-ghost btn-xs font-mono"
                              />
                            )}
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => setEditingId(v.id)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => openDelete(v)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-base-content/60">No variables yet.</p>
        )}

        <div className="divider text-xs">Add Variable</div>

        <form action={addFormAction} className="space-y-3">
          <div className="flex gap-2">
            <input
              name="key"
              type="text"
              placeholder="KEY"
              className="input input-bordered input-sm font-mono flex-1"
              required
            />
            <input
              name="value"
              type="text"
              placeholder="value"
              className="input input-bordered input-sm flex-1"
              required
            />
            <button type="submit" className="btn btn-primary btn-sm shrink-0">
              Add
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
            <input type="checkbox" name="isSecret" className="checkbox checkbox-sm" />
            <span>Secret</span>
            <span className="text-base-content/50 text-xs">
              (value hidden after saving)
            </span>
          </label>
          {addState?.error && (
            <p className="text-error text-sm">{addState.error}</p>
          )}
        </form>
      </div>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">
            Delete &ldquo;{pending?.key}&rdquo;?
          </h3>
          <p className="py-4 text-base-content/70 text-sm">
            This environment variable will be permanently removed.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            <form
              action={async (fd) => {
                await deleteEnvVar(fd);
                dialogRef.current?.close();
              }}
            >
              <input type="hidden" name="id" value={pending?.id ?? ""} />
              <button type="submit" className="btn btn-error">
                Delete
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function mask(text: string): string {
  if (text.length <= 6) return text;
  return text.slice(0, 3) + "**********" + text.slice(-3);
}

function ClickToCopy({
  text,
  display,
  className,
}: {
  text: string;
  display?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Tooltip content={copied ? "Copied!" : "Click to copy"} placement="top">
      <span
        onClick={handleClick}
        className={`cursor-pointer select-none transition-opacity hover:opacity-60 ${className ?? ""}`}
      >
        {display ?? text}
      </span>
    </Tooltip>
  );
}

function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {copied ? "Copied!" : label}
    </button>
  );
}

interface EditRowProps {
  envVar: DisplayEnvVar;
  onDone: () => void;
}

function EditRow({ envVar, onDone }: EditRowProps) {
  const updateAction = updateEnvVarValue.bind(null, envVar.id);

  return (
    <tr className="bg-base-200">
      <td className="font-mono text-sm">{envVar.key}</td>
      <td colSpan={2}>
        <form
          action={async (fd) => {
            await updateAction(fd);
            onDone();
          }}
          className="flex gap-2 items-center"
        >
          <input
            name="value"
            type="text"
            defaultValue={envVar.value ?? ""}
            placeholder={envVar.isSecret ? "Enter new value" : ""}
            className="input input-bordered input-sm flex-1"
            autoFocus
            required
          />
          <button type="submit" className="btn btn-primary btn-xs shrink-0">
            Save
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs shrink-0"
            onClick={onDone}
          >
            Cancel
          </button>
        </form>
      </td>
    </tr>
  );
}

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
