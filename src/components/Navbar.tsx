import { auth } from "@/lib/auth";
import Link from "next/link";
import { NavbarUserMenu } from "./NavbarUserMenu";

export async function Navbar() {
  const session = await auth();

  return (
    <div className="navbar bg-base-200">
      <div className="flex-1 gap-2">
        <Link href="/" className="btn btn-ghost text-xl">
          Bastion
        </Link>
        {session?.user && (
          <Link href="/projects" className="btn btn-ghost btn-sm">
            Projects
          </Link>
        )}
      </div>
      <div className="flex-none gap-2">
        <NavbarUserMenu user={session?.user ?? null} />
      </div>
    </div>
  );
}
