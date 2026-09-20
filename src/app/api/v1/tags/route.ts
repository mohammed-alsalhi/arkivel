import { NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import prisma from "@/lib/prisma";
import { apiV1Headers } from "@/lib/public-api-v1";

export async function GET() {
  const disabled = await moduleDisabledResponse("api");
  if (disabled) return disabled;

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: {
      name: true,
      slug: true,
      color: true,
      parent: { select: { name: true, slug: true } },
      _count: {
        select: {
          articles: {
            where: { article: { published: true, status: "published" } },
          },
          children: true,
        },
      },
    },
  });

  const formatted = tags.map((t) => ({
    name: t.name,
    slug: t.slug,
    color: t.color,
    parent: t.parent ? { name: t.parent.name, slug: t.parent.slug } : null,
    articleCount: t._count.articles,
    childCount: t._count.children,
  }));

  return NextResponse.json({ tags: formatted }, { headers: apiV1Headers });
}

export const dynamic = "force-dynamic";
