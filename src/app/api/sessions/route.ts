import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/sessions — list current user's active sessions */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    select: { id: true, createdAt: true, expiresAt: true, userAgent: true, ipAddress: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sessions);
}
