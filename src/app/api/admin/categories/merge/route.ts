import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { sourceId, targetId } = await request.json();
  if (!sourceId || !targetId) {
    return NextResponse.json({ error: "sourceId and targetId are required" }, { status: 400 });
  }
  if (sourceId === targetId) {
    return NextResponse.json({ error: "Source and target must be different" }, { status: 400 });
  }

  // Verify both categories exist
  const [source, target] = await Promise.all([
    prisma.category.findUnique({ where: { id: sourceId }, select: { id: true, name: true } }),
    prisma.category.findUnique({ where: { id: targetId }, select: { id: true, name: true } }),
  ]);
  if (!source) return NextResponse.json({ error: "Source category not found" }, { status: 404 });
  if (!target) return NextResponse.json({ error: "Target category not found" }, { status: 404 });

  // Reassign articles and reparent child categories, then delete source
  const [articleResult] = await prisma.$transaction([
    prisma.article.updateMany({
      where: { categoryId: sourceId },
      data: { categoryId: targetId },
    }),
    prisma.category.updateMany({
      where: { parentId: sourceId },
      data: { parentId: targetId },
    }),
    prisma.category.delete({ where: { id: sourceId } }),
  ]);

  return NextResponse.json({
    ok: true,
    articlesReassigned: articleResult.count,
    sourceName: source.name,
    targetName: target.name,
  });
}
