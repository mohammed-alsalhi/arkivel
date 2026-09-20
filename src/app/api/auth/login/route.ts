import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Path 1: User-based login (username + password)
  if (body.username && body.password) {
    const user = await prisma.user.findUnique({
      where: { username: body.username },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create session
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        userAgent: request.headers.get("user-agent") ?? null,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
      },
    });

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
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  }

  return NextResponse.json({ error: "Username and password required" }, { status: 400 });
}

export const dynamic = "force-dynamic";
