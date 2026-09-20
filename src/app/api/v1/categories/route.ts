import { NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import prisma from "@/lib/prisma";
import { apiV1Headers } from "@/lib/public-api-v1";

export async function GET() {
  const disabled = await moduleDisabledResponse("api");
  if (disabled) return disabled;

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      name: true,
      slug: true,
      description: true,
      sortOrder: true,
      parent: { select: { name: true, slug: true } },
      _count: {
        select: {
          articles: { where: { published: true, status: "published" } },
          children: true,
        },
      },
    },
  });

  const formatted = categories.map((c) => ({
    name: c.name,
    slug: c.slug,
    description: c.description,
    sortOrder: c.sortOrder,
    parent: c.parent ? { name: c.parent.name, slug: c.parent.slug } : null,
    articleCount: c._count.articles,
    childCount: c._count.children,
  }));

  return NextResponse.json({ categories: formatted }, { headers: apiV1Headers });
}

export const dynamic = "force-dynamic";
