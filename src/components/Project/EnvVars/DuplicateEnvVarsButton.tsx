"use client";

import { useRef, useState, useTransition } from "react";

interface Project {
  id: string;
  name: string;
}

interface Props {
  duplicateAction: (formData: FormData) => Promise<{ error: string } | null>;
  otherProjects: Project[];
}

export function DuplicateEnvVarsButton({ duplicateAction, otherProjects }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [targetType, setTargetType] = useState<"existing" | "new">("existing");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open() {
    setTargetType("existing");
    setError(null);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-xs" onClick={open}>
        Duplicate
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Duplicate env vars</h3>
          <p className="py-2 text-sm text-base-content/70">
            Copy all env vars (including secrets and locked state) to another project.
            Existing vars in the target will be overwritten.
          </p>

          <form
            action={(fd) => {
              setError(null);
              startTransition(async () => {
                const result = await duplicateAction(fd);
                if (result?.error) {
                  setError(result.error);
                } else {
                  dialogRef.current?.close();
                }
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetType"
                  value="existing"
                  className="radio radio-sm"
                  checked={targetType === "existing"}
                  onChange={() => setTargetType("existing")}
                />
                <span className="text-sm">Existing project</span>
              </label>

              {targetType === "existing" && (
                otherProjects.length === 0 ? (
                  <p className="text-sm text-base-content/50 pl-6">No other projects available.</p>
                ) : (
                  <select name="targetProjectId" className="select select-bordered select-sm w-full">
                    {otherProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetType"
                  value="new"
                  className="radio radio-sm"
                  checked={targetType === "new"}
                  onChange={() => setTargetType("new")}
                />
                <span className="text-sm">New project</span>
              </label>

              {targetType === "new" && (
                <input
                  name="newProjectName"
                  type="text"
                  placeholder="Project name"
                  className="input input-bordered input-sm w-full"
                  required
                  autoFocus
                />
              )}
            </div>

            {error && <p className="text-error text-sm">{error}</p>}

            <div className="modal-action mt-2">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => dialogRef.current?.close()}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isPending || (targetType === "existing" && otherProjects.length === 0)}
              >
                {isPending ? "Duplicating…" : "Duplicate"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
