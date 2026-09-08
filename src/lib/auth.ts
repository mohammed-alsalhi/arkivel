import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { bearerToken, resolveApiToken } from "@/lib/api-tokens";
import prisma from "@/lib/prisma";

const SESSION_COOKIE = "session_token";

export async function isAdmin(): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret && process.env.NODE_ENV === "development") return true;

  const session = await getSession();
  return !!(session && session.role === "admin");
}

export function requireAdmin(isAuthed: boolean): NextResponse | null {
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  role: string;
};

/**
 * The signed-in user: the browser session cookie, or a personal access
 * token in `Authorization: Bearer ark_…` (see `src/lib/api-tokens.ts`), which
 * is how external apps use every `/api/**` route.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    const raw = bearerToken((await headers()).get("authorization"));
    return raw ? resolveApiToken(raw) : null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          role: true,
        },
      },
    },
  });

  if (!session) return null;

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

export function requireRole(
  user: SessionUser | null,
  role: string
): NextResponse | null {
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const roleHierarchy: Record<string, number> = {
    viewer: 0,
    editor: 1,
    admin: 2,
  };

  const userLevel = roleHierarchy[user.role] ?? 0;
  const requiredLevel = roleHierarchy[role] ?? 0;

  if (userLevel < requiredLevel) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  return null;
}
