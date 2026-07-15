"use client";

import { useRef, useState } from "react";

interface Props {
  apiKey: string | null;
  regenerateAction: () => Promise<void>;
}

function maskKey(key: string): string {
  if (key.length <= 6) return key;
  return key.slice(0, 3) + "**********" + key.slice(-3);
}

export function ApiKeyDisplay({ apiKey, regenerateAction }: Props) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  async function handleCopy() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-sm bg-base-300 px-3 py-2 rounded overflow-x-auto">
          {apiKey ? maskKey(apiKey) : "No key generated"}
        </code>
        {apiKey && (
          <button onClick={handleCopy} className="btn btn-sm btn-ghost shrink-0">
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
        <button
          className="btn btn-sm btn-outline shrink-0"
          onClick={() => dialogRef.current?.showModal()}
        >
          Regenerate
        </button>
      </div>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Regenerate API key?</h3>
          <p className="py-4 text-base-content/70 text-sm">
            The current key will stop working immediately. Any clients using it will need to be updated.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            <form
              action={async () => {
                await regenerateAction();
                dialogRef.current?.close();
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
    </>
  );
}
