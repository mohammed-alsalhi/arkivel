import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import prisma from "@/lib/prisma";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
  ],

  callbacks: {
    /**
     * Called after a successful OAuth sign-in.
     * Links OAuth accounts to existing wiki users by email, or creates a
     * new user (with "viewer" role) if no matching account exists.
     * Stores an OAuthAccount record for the provider/account pair.
     */
    async signIn({ user, account }) {
      if (!account || !user.email) return true;

      try {
        // Check if an OAuthAccount record already exists for this provider+id pair
        const existingOAuth = await prisma.oAuthAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          include: { user: true },
        });

        if (existingOAuth) {
          // Already linked — update tokens if they changed
          await prisma.oAuthAccount.update({
            where: { id: existingOAuth.id },
            data: {
              accessToken: account.access_token ?? null,
              refreshToken: account.refresh_token ?? null,
              expiresAt: account.expires_at ?? null,
            },
          });
          return true;
        }

        // Try to link to an existing user by email
        let wikiUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!wikiUser) {
          // Create a new user account with viewer role
          const username = await generateUniqueUsername(
            user.name || user.email.split("@")[0]
          );
          wikiUser = await prisma.user.create({
            data: {
              username,
              email: user.email,
              displayName: user.name || null,
              // No password — OAuth-only accounts use empty string sentinel
              passwordHash: "",
              role: "viewer",
            },
          });
        }

        // Store OAuthAccount record
        await prisma.oAuthAccount.create({
          data: {
            userId: wikiUser.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            accessToken: account.access_token ?? null,
            refreshToken: account.refresh_token ?? null,
            expiresAt: account.expires_at ?? null,
          },
        });

        return true;
      } catch (err) {
        console.error("[oauth] signIn callback error:", err);
        return false;
      }
    },

    /**
     * Called whenever a session is checked.
     * Adds the wiki user's role to the session object so client components
     * can gate UI on role without an extra API call.
     */
    async session({ session }) {
      if (session.user?.email) {
        try {
          const wikiUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, role: true, username: true, displayName: true },
          });

          if (wikiUser) {
            // Augment the session type with wiki-specific fields
            (session.user as typeof session.user & {
              id: string;
              role: string;
              username: string;
              displayName: string | null;
            }).id = wikiUser.id;
            (session.user as typeof session.user & { role: string }).role = wikiUser.role;
            (session.user as typeof session.user & { username: string }).username = wikiUser.username;
            (session.user as typeof session.user & { displayName: string | null }).displayName =
              wikiUser.displayName;
          }
        } catch (err) {
          console.error("[oauth] session callback error:", err);
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  // Use JWT strategy to avoid requiring a NextAuth DB adapter
  // (the wiki has its own session system; OAuth callbacks handle user mapping)
  session: {
    strategy: "jwt",
  },

  // Signing secret for JWT — must be set in production
  secret: process.env.NEXTAUTH_SECRET,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a unique username by appending a numeric suffix if the base name
 * is already taken.
 */
async function generateUniqueUsername(base: string): Promise<string> {
  // Sanitise: lowercase, replace non-alphanumeric with underscores, trim
  const sanitised = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30) || "user";

  const existing = await prisma.user.findUnique({ where: { username: sanitised } });
  if (!existing) return sanitised;

  // Try up to 99 numeric suffixes
  for (let i = 2; i <= 99; i++) {
    const candidate = `${sanitised}_${i}`;
    const clash = await prisma.user.findUnique({ where: { username: candidate } });
    if (!clash) return candidate;
  }

  // Fallback: append random hex
  return `${sanitised}_${Math.random().toString(16).slice(2, 8)}`;
}
