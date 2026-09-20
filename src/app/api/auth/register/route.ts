import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registrationAllowed } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!await registrationAllowed()) {
    return NextResponse.json({ error: "Registration is closed. Contact your administrator." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.username !== "string" || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "username, email, and password are required" }, { status: 400 });
  }
  const { username, password } = body;
  const email = body.email.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return NextResponse.json({ error: "Use a 3–30 character username (letters, numbers, underscores), a valid email, and a password of at least 12 characters and at most 72 UTF-8 bytes." }, { status: 400 });
  }
  if (await prisma.user.findFirst({ where: { OR: [{ username }, { email: { equals: email, mode: "insensitive" } }] }, select: { id: true } })) {
    return NextResponse.json({ error: "Username or email is already registered" }, { status: 409 });
  }
  try {
    const user = await prisma.user.create({
      data: { username, email, passwordHash: await bcrypt.hash(password, 12), displayName: username, role: "viewer" },
      select: { id: true, username: true, email: true, displayName: true, role: true, createdAt: true },
    });
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Username or email is already registered" }, { status: 409 });
    }
    throw error;
  }
}

export const dynamic = "force-dynamic";
