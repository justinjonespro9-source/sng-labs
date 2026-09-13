import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserRole } from "@prisma/client";
import { isAllowedEmail, roleForAllowedEmail } from "@/lib/auth/allowlist";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [Google],
  pages: { signIn: "/sign-in" },
  callbacks: {
    signIn({ account, profile, user }) {
      if (account?.provider !== "google") return false;
      const email = profile?.email ?? user.email;
      return profile?.email_verified === true && isAllowedEmail(email);
    },
    authorized({ auth: session, request }) {
      if (!request.nextUrl.pathname.startsWith("/command-center")) return true;
      return Boolean(session?.user && isAllowedEmail(session.user.email));
    },
    jwt({ token, user }) {
      if (user) token.role = roleForAllowedEmail(user.email) as UserRole;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role ?? "VIEWER") as UserRole;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id || !user.email) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { role: roleForAllowedEmail(user.email) as UserRole },
      });
      await prisma.auditEvent.create({
        data: { actorId: user.id, action: "auth.sign_in", entityType: "User", entityId: user.id },
      });
    },
  },
});
