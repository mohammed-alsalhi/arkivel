import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin, requireAdmin } from "@/lib/auth";
import { RELATION_TYPES } from "@/lib/relations";
import { articleVisibilityFilter, canViewArticle } from "@/lib/article-visibility";

type RelationInfo = { label: string; inverse: string; icon: string };
const RELATION_MAP = RELATION_TYPES as Record<string, RelationInfo>;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const canViewDrafts = await isAdmin();

  // Get the article to find its slug for incoming links
  const article = await prisma.article.findUnique({
    where: { id },
    select: { id: true, slug: true, published: true, status: true },
  });

  if (!article || !canViewArticle(article, canViewDrafts)) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Outgoing links from this article
  const outgoing = await prisma.articleLink.findMany({
    where: { sourceId: id },
    select: {
      id: true,
      targetSlug: true,
      relation: true,
      createdAt: true,
    },
  });

  // Incoming links to this article (by slug)
  const incoming = await prisma.articleLink.findMany({
    where: {
      targetSlug: article.slug,
      source: articleVisibilityFilter(canViewDrafts),
    },
    select: {
      id: true,
      sourceId: true,
      relation: true,
      createdAt: true,
      source: { select: { title: true, slug: true } },
    },
  });

  // Resolve outgoing target slugs to article titles
  const targetSlugs = outgoing.map((l) => l.targetSlug);
  const targetArticles = await prisma.article.findMany({
    where: { slug: { in: targetSlugs }, ...articleVisibilityFilter(canViewDrafts) },
    select: { title: true, slug: true },
  });
  const slugToTitle = new Map(targetArticles.map((a) => [a.slug, a.title]));

  const outgoingFormatted = outgoing.filter((link) => canViewDrafts || slugToTitle.has(link.targetSlug)).map((l) => ({
    id: l.id,
    targetSlug: l.targetSlug,
    targetTitle: slugToTitle.get(l.targetSlug) || l.targetSlug,
    relation: l.relation,
    relationLabel: RELATION_MAP[l.relation]?.label || l.relation,
    createdAt: l.createdAt.toISOString(),
  }));

  const incomingFormatted = incoming.map((l) => ({
    id: l.id,
    sourceSlug: l.source.slug,
    sourceTitle: l.source.title,
    relation: l.relation,
    relationLabel:
      RELATION_MAP[l.relation]?.inverse ||
      RELATION_MAP[l.relation]?.label ||
      l.relation,
    createdAt: l.createdAt.toISOString(),
  }));

  return NextResponse.json({ outgoing: outgoingFormatted, incoming: incomingFormatted });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();
  const { targetSlug, relation } = body;

  if (!targetSlug || !relation) {
    return NextResponse.json(
      { error: "targetSlug and relation are required" },
      { status: 400 }
    );
  }

  if (!(relation in RELATION_TYPES)) {
    return NextResponse.json(
      { error: `Invalid relation type. Must be one of: ${Object.keys(RELATION_TYPES).join(", ")}` },
      { status: 400 }
    );
  }

  // Check source article exists
  const source = await prisma.article.findUnique({ where: { id } });
  if (!source) {
    return NextResponse.json({ error: "Source article not found" }, { status: 404 });
  }

  // Check target article exists
  const target = await prisma.article.findUnique({ where: { slug: targetSlug } });
  if (!target) {
    return NextResponse.json({ error: "Target article not found" }, { status: 404 });
  }

  const link = await prisma.articleLink.create({
    data: {
      sourceId: id,
      targetSlug,
      relation,
    },
  });

  return NextResponse.json(link, { status: 201 });
}

export const dynamic = "force-dynamic";
