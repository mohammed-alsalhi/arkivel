import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { password } = body;

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const article = await prisma.article.findUnique({
    where: { id },
    select: { accessPassword: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!article.accessPassword) {
    // No password set — allow access
    return NextResponse.json({ ok: true });
  }

  if (article.accessPassword !== password) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
