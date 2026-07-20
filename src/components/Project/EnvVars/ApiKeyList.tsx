"use client";

import { useRef, useState } from "react";

export interface DisplayApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
}

interface Props {
  apiKeys: DisplayApiKey[];
  createKeyAction: (formData: FormData) => Promise<void>;
  regenerateAction: (keyId: string) => Promise<void>;
  deleteAction: (keyId: string) => Promise<void>;
}

function maskKey(key: string): string {
  if (key.length <= 6) return key;
  return key.slice(0, 6) + "**********" + key.slice(-4);
}

export function ApiKeyList({ apiKeys, createKeyAction, regenerateAction, deleteAction }: Props) {
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const regenDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<DisplayApiKey | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(key: DisplayApiKey) {
    await navigator.clipboard.writeText(key.key);
    setCopiedId(key.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openRegen(key: DisplayApiKey) {
    setPending(key);
    regenDialogRef.current?.showModal();
  }

  function openDelete(key: DisplayApiKey) {
    setPending(key);
    deleteDialogRef.current?.showModal();
  }

  const canDelete = apiKeys.length > 1;

  return (
    <>
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k) => (
                <tr key={k.id}>
                  <td className="font-medium">{k.name}</td>
                  <td>
                    <code className="font-mono text-sm text-base-content/70">
                      {maskKey(k.key)}
                    </code>
                  </td>
                  <td className="text-sm text-base-content/60 whitespace-nowrap">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleCopy(k)}
                      >
                        {copiedId === k.id ? "Copied!" : "Copy"}
                      </button>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => openRegen(k)}
                      >
                        Regenerate
                      </button>
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => openDelete(k)}
                        disabled={!canDelete}
                        title={!canDelete ? "Cannot delete the last API key" : undefined}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => addDialogRef.current?.showModal()}
          >
            + Add key
          </button>
        </div>
      </div>

      {/* Add key dialog */}
      <dialog ref={addDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Add API key</h3>
          <form
            action={async (fd) => {
              await createKeyAction(fd);
              addDialogRef.current?.close();
            }}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="label">
                <span className="label-text">Key name</span>
              </label>
              <input
                name="name"
                type="text"
                placeholder="e.g. Mobile app"
                className="input input-bordered w-full"
                maxLength={100}
                required
                autoFocus
              />
            </div>
            <div className="modal-action mt-0">
              <button
                type="button"
                className="btn"
                onClick={() => addDialogRef.current?.close()}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Regenerate dialog */}
      <dialog ref={regenDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Regenerate &ldquo;{pending?.name}&rdquo;?</h3>
          <p className="py-4 text-base-content/70 text-sm">
            The current key will stop working immediately. Any clients using it will need to be updated.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            <form
              action={async () => {
                if (!pending) return;
                await regenerateAction(pending.id);
                regenDialogRef.current?.close();
              }}
            >
              <button type="submit" className="btn btn-warning">
                Regenerate
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Delete dialog */}
      <dialog ref={deleteDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Delete &ldquo;{pending?.name}&rdquo;?</h3>
          <p className="py-4 text-base-content/70 text-sm">
            This key will stop working immediately and cannot be recovered.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            <form
              action={async () => {
                if (!pending) return;
                await deleteAction(pending.id);
                deleteDialogRef.current?.close();
              }}
            >
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
