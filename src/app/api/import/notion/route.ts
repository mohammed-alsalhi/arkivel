import { NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import prisma from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { fetchNotionPage } from "@/lib/import/notion";

export async function POST(request: Request) {
  const disabled = await moduleDisabledResponse("import");
  if (disabled) return disabled;

  const user = await getSession();
  if (!user || !await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { accessToken, pageId, categoryId } = await request.json();
  if (!accessToken || !pageId)
    return NextResponse.json({ error: "accessToken and pageId required" }, { status: 400 });

  const { title, html } = await fetchNotionPage(accessToken, pageId);

  const slug = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);

  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Article with this slug already exists", slug }, { status: 409 });
  }

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      content: html,
      status: "draft",
      published: false,
      userId: user.id,
      categoryId: categoryId ?? undefined,
    },
    select: { id: true, slug: true, title: true },
  });

  return NextResponse.json(article, { status: 201 });
}

export const dynamic = "force-dynamic";
