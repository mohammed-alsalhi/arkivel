import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await request.json();
  if (!userId || !["viewer", "editor", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, username: true, role: true },
  });

  return NextResponse.json(user);
}

export async function GET() {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          articles: true,
          revisions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export const dynamic = "force-dynamic";
