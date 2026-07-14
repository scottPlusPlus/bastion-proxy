import { auth } from "@/lib/auth";
import Link from "next/link";
import { NavbarUserMenu } from "./navbar-user-menu";

export async function Navbar() {
  const session = await auth();

  return (
    <div className="navbar bg-base-200">
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl">
          Bastion
        </Link>
      </div>
      <div className="flex-none gap-2">
        <NavbarUserMenu user={session?.user ?? null} />
      </div>
    </div>
  );
}
