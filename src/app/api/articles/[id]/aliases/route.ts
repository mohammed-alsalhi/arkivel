import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { canViewArticle } from "@/lib/article-visibility";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const canViewDrafts = await isAdmin();
  const article = await prisma.article.findUnique({
    where: { id },
    select: { published: true, status: true },
  });
  if (!article || !canViewArticle(article, canViewDrafts)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const aliases = await prisma.alias.findMany({
    where: { articleId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, alias: true },
  });
  return NextResponse.json(aliases);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { alias } = await req.json();
  if (!alias || typeof alias !== "string" || alias.trim().length < 2) {
    return NextResponse.json({ error: "Invalid alias" }, { status: 400 });
  }
  try {
    const created = await prisma.alias.create({
      data: { articleId: id, alias: alias.trim() },
      select: { id: true, alias: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Alias already exists" }, { status: 409 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { aliasId } = await req.json();
  await prisma.alias.deleteMany({ where: { id: aliasId, articleId: id } });
  return NextResponse.json({ ok: true });
}
