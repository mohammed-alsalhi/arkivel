import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import prisma from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

type GraphNode = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  categorySlug: string | null;
};

type GraphEdge = {
  source: string;
  target: string;
  type: string; // "wiki-link" | "semantic"
  relation?: string;
};

export async function GET(request: NextRequest) {
  const disabled = await moduleDisabledResponse("graph");
  if (disabled) return disabled;

  const centerSlug = request.nextUrl.searchParams.get("center") || undefined;
  const depth = Math.min(
    5,
    Math.max(1, parseInt(request.nextUrl.searchParams.get("depth") || "2"))
  );

  // Fetch all published articles
  const allArticles = await prisma.article.findMany({
    where: { published: true, status: "published" },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      category: { select: { name: true, slug: true } },
    },
  });

  // Fetch all semantic links
  const semanticLinks = await prisma.articleLink.findMany({
    select: {
      sourceId: true,
      targetSlug: true,
      relation: true,
    },
  });

  // Build slug-to-article maps
  const slugToArticle = new Map(allArticles.map((a) => [a.slug, a]));
  const idToArticle = new Map(allArticles.map((a) => [a.id, a]));

  // Parse wiki links from content to build edges
  const allEdges: GraphEdge[] = [];
  const wikiLinkRegex = /data-wiki-link="([^"]+)"/g;

  for (const article of allArticles) {
    let match;
    const seen = new Set<string>();
    while ((match = wikiLinkRegex.exec(article.content)) !== null) {
      const targetTitle = match[1];
      const targetSlug = generateSlug(targetTitle);
      if (targetSlug !== article.slug && !seen.has(targetSlug) && slugToArticle.has(targetSlug)) {
        seen.add(targetSlug);
        allEdges.push({
          source: article.slug,
          target: targetSlug,
          type: "wiki-link",
        });
      }
    }
  }

  // Add semantic link edges
  for (const link of semanticLinks) {
    const sourceArticle = idToArticle.get(link.sourceId);
    if (sourceArticle && slugToArticle.has(link.targetSlug)) {
      allEdges.push({
        source: sourceArticle.slug,
        target: link.targetSlug,
        type: "semantic",
        relation: link.relation,
      });
    }
  }

  // If centered on a specific article, do BFS to limit depth
  if (centerSlug && slugToArticle.has(centerSlug)) {
    const visited = new Set<string>();
    const queue: { slug: string; d: number }[] = [{ slug: centerSlug, d: 0 }];
    visited.add(centerSlug);

    // Build adjacency list
    const adjacency = new Map<string, Set<string>>();
    for (const edge of allEdges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
      if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
      adjacency.get(edge.source)!.add(edge.target);
      adjacency.get(edge.target)!.add(edge.source);
    }

    while (queue.length > 0) {
      const { slug, d } = queue.shift()!;
      if (d >= depth) continue;
      const neighbors = adjacency.get(slug);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push({ slug: neighbor, d: d + 1 });
          }
        }
      }
    }

    // Filter to visited nodes and edges
    const filteredNodes: GraphNode[] = [];
    for (const slug of visited) {
      const article = slugToArticle.get(slug);
      if (article) {
        filteredNodes.push({
          id: article.slug,
          title: article.title,
          slug: article.slug,
          category: article.category?.name || null,
          categorySlug: article.category?.slug || null,
        });
      }
    }

    const filteredEdges = allEdges.filter(
      (e) => visited.has(e.source) && visited.has(e.target)
    );

    return NextResponse.json({
      nodes: filteredNodes,
      edges: filteredEdges,
    });
  }

  // Return full graph
  const nodes: GraphNode[] = allArticles.map((a) => ({
    id: a.slug,
    title: a.title,
    slug: a.slug,
    category: a.category?.name || null,
    categorySlug: a.category?.slug || null,
  }));

  return NextResponse.json({ nodes, edges: allEdges });
}

export const dynamic = "force-dynamic";
