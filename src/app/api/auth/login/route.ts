import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSession, revokeBrowserSessions, SESSION_MAX_AGE } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  // Path 1: User-based login (username + password)
  if (typeof body?.username === "string" && typeof body?.password === "string" && body.username.length <= 1024 && body.password.length <= 1024) {
    const user = await prisma.user.findUnique({
      where: { username: body.username },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await revokeBrowserSessions();
    const { token } = await createSession(user.id, request);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });

    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    for (const cookie of (await cookies()).getAll()) {
      if (/^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(cookie.name)) {
        response.cookies.set(cookie.name, "", { httpOnly: true, secure: cookie.name.startsWith("__Secure-") || request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 0 });
      }
    }
    return response;
  }

  return NextResponse.json({ error: "Username and password required" }, { status: 400 });
}

export const dynamic = "force-dynamic";
