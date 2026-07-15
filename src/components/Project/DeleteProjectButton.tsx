"use client";

import { useRef } from "react";

interface Props {
  projectName: string;
  deleteAction: () => Promise<void>;
}

export function DeleteProjectButton({ projectName, deleteAction }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        className="btn btn-error btn-sm"
        onClick={() => dialogRef.current?.showModal()}
      >
        Delete project
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Delete &ldquo;{projectName}&rdquo;?</h3>
          <p className="py-4 text-base-content/70 text-sm">
            This will permanently delete the project, its API key, and all environment variables.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            <form action={deleteAction}>
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
