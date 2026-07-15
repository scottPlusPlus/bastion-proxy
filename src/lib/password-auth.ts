import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export type LoginResult = { ok: true } | { ok: false; error: string };

function secureCookies(): boolean {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  return (
    process.env.NODE_ENV === "production" || authUrl.startsWith("https://")
  );
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user?.hashedPassword) {
    return { ok: false, error: "Invalid email or password" };
  }

  const valid = await verifyPassword(password, user.hashedPassword);
  if (!valid) {
    return { ok: false, error: "Invalid email or password" };
  }

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  const secure = secureCookies();
  const cookieStore = await cookies();
  cookieStore.set("authjs.session-token.bastion", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    expires,
  });

  return { ok: true };
}
