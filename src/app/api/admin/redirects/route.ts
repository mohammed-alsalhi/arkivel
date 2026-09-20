import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const redirects = await prisma.redirect.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(redirects);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { fromSlug, toSlug } = await request.json();
  if (!fromSlug || !toSlug) {
    return NextResponse.json({ error: "fromSlug and toSlug are required" }, { status: 400 });
  }

  const redirect = await prisma.redirect.upsert({
    where: { fromSlug },
    create: { fromSlug, toSlug },
    update: { toSlug },
  });
  return NextResponse.json(redirect);
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { id } = await request.json();
  await prisma.redirect.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
