"use client";

import { useState } from "react";
import { renameProject } from "@/lib/project-actions";

interface Props {
  id: string;
  currentName: string;
}

export function RenameProjectForm({ id, currentName }: Props) {
  const [editing, setEditing] = useState(false);
  const renameAction = renameProject.bind(null, id);

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{currentName}</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
          Rename
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await renameAction(formData);
        setEditing(false);
      }}
      className="flex items-center gap-2"
    >
      <input
        name="name"
        type="text"
        defaultValue={currentName}
        className="input input-bordered"
        autoFocus
        required
      />
      <button type="submit" className="btn btn-primary btn-sm">
        Save
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setEditing(false)}
      >
        Cancel
      </button>
    </form>
  );
}
