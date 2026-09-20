import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const { username, email, password } = await request.json();

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: "username, email, and password are required" },
      { status: 400 }
    );
  }

  if (username.length < 3) {
    return NextResponse.json(
      { error: "Username must be at least 3 characters" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  // Check for existing user
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // First user ever becomes admin
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "admin" : "viewer";

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      displayName: username,
      role,
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, user }, { status: 201 });
}

export const dynamic = "force-dynamic";
