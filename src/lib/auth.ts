import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { randomBytes } from "node:crypto";
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

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export async function registrationAllowed(): Promise<boolean> {
  return process.env.ARKIVEL_REGISTRATION === "open" && !!(await prisma.user.findFirst({
    where: { role: "admin" }, select: { id: true },
  }));
}

export async function createSession(userId: string, request?: NextRequest) {
  return prisma.session.create({
    data: {
      userId,
      token: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      userAgent: request?.headers.get("user-agent") ?? null,
      ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
    },
  });
}

// The encrypted OAuth cookie references the same revocable database sessions
// as password login. Never resolve an identity from a JWT email or cached role.
export async function getOAuthSessionToken(request?: NextRequest): Promise<string | null> {
  if (!process.env.NEXTAUTH_SECRET) return null;
  const cookieStore = request?.cookies ?? await cookies();
  const token = await getToken({
    req: request ?? new NextRequest(process.env.NEXTAUTH_URL || "http://localhost:3000", {
      headers: { cookie: cookieStore.toString() },
    }),
    secret: process.env.NEXTAUTH_SECRET,
  });
  return typeof token?.arkivelSessionToken === "string" ? token.arkivelSessionToken : null;
}

export async function revokeBrowserSessions() {
  const cookieStore = await cookies();
  const tokens = [cookieStore.get(SESSION_COOKIE)?.value, await getOAuthSessionToken()].filter((token): token is string => !!token);
  if (tokens.length) await prisma.session.deleteMany({ where: { token: { in: tokens } } });
}

export async function resolveSession(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, username: true, email: true, displayName: true, role: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
}

export async function getSession(request?: NextRequest): Promise<SessionUser | null> {
  const cookieStore = request?.cookies ?? await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) return resolveSession(token);
  const oauthToken = await getOAuthSessionToken(request);
  if (oauthToken) return resolveSession(oauthToken);
  const raw = bearerToken((request?.headers ?? await headers()).get("authorization"));
  return raw ? resolveApiToken(raw) : null;
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

  const userLevel = Object.hasOwn(roleHierarchy, user.role) ? roleHierarchy[user.role] : undefined;
  const requiredLevel = Object.hasOwn(roleHierarchy, role) ? roleHierarchy[role] : undefined;

  if (userLevel === undefined || requiredLevel === undefined || userLevel < requiredLevel) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  return null;
}
