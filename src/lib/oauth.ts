import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { createSession, registrationAllowed, resolveSession, revokeBrowserSessions, SESSION_MAX_AGE } from "@/lib/auth";

const providers: AuthOptions["providers"] = [];
if (process.env.NEXTAUTH_SECRET && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }));
}
if (process.env.NEXTAUTH_SECRET && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(GitHubProvider({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }));
}

export const authOptions: AuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !providers.some(provider => provider.id === account.provider)) return false;
      const identity = { provider: account.provider, providerAccountId: account.providerAccountId };
      const existing = await prisma.oAuthAccount.findUnique({ where: { provider_providerAccountId: identity } });
      if (existing) return true;
      if (!user.email || !await registrationAllowed()) return false;
      const email = user.email.trim().toLowerCase();
      // Matching email alone does not prove ownership of an existing Arkivel
      // account. Linking requires an explicit authenticated flow (not yet shipped).
      if (await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })) return false;
      const base = (user.name || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20) || "user";
      try {
        await prisma.user.create({
          data: {
            username: `${base}_${randomBytes(4).toString("hex")}`,
            email, displayName: user.name || null, passwordHash: "", role: "viewer",
            oauthAccounts: { create: identity },
          },
        });
        return true;
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") return false;
        throw error;
      }
    },
    async jwt({ token, account }) {
      if (account) {
        const linked = await prisma.oAuthAccount.findUnique({
          where: { provider_providerAccountId: { provider: account.provider, providerAccountId: account.providerAccountId } },
        });
        if (!linked) throw new Error("OAuth account is not linked");
        await revokeBrowserSessions();
        // A prior password cookie must not mask the newly chosen OAuth identity.
        (await cookies()).set("session_token", "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
        token.arkivelSessionToken = (await createSession(linked.userId)).token;
      }
      return token;
    },
    async session({ session, token }) {
      const user = typeof token.arkivelSessionToken === "string" ? await resolveSession(token.arkivelSessionToken) : null;
      session.user = user ? { ...user, name: user.displayName || user.username } : undefined;
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && typeof message.token?.arkivelSessionToken === "string") {
        await prisma.session.deleteMany({ where: { token: message.token.arkivelSessionToken } });
      }
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  secret: process.env.NEXTAUTH_SECRET,
};
