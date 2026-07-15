import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  cookies: {
    sessionToken: { name: "authjs.session-token.bastion" },
    callbackUrl: { name: "authjs.callback-url.bastion" },
    csrfToken: { name: "authjs.csrf-token.bastion" },
    pkceCodeVerifier: { name: "authjs.pkce.code_verifier.bastion" },
    state: { name: "authjs.state.bastion" },
    nonce: { name: "authjs.nonce.bastion" },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
