"use client";

import { signIn, signOut } from "next-auth/react";

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
}

export function NavbarUserMenu({ user }: Props) {
  if (!user) {
    return (
      <button className="btn btn-primary btn-sm" onClick={() => signIn()}>
        Sign in
      </button>
    );
  }

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost btn-circle"
      >
        {user.image ? (
          <div className="avatar w-10 rounded-full">
            <img alt={user.name ?? "Avatar"} src={user.image} />
          </div>
        ) : (
          <div className="avatar avatar-placeholder">
            <div className="bg-neutral text-neutral-content w-10 rounded-full">
              <span className="text-sm">{(user.name ?? user.email ?? "?")[0].toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>
      <ul
        tabIndex={0}
        className="menu dropdown-content bg-base-100 rounded-box z-10 mt-3 max-w-96 p-2 shadow"
      >
        <li className="menu-title">{user.email}</li>
        <li>
          <button onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </button>
        </li>
      </ul>
    </div>
  );
}
