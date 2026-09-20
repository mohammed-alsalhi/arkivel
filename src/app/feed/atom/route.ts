import { NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import prisma from "@/lib/prisma";
import { config } from "@/lib/config";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function GET() {
  const disabled = await moduleDisabledResponse("feeds");
  if (disabled) return disabled;

  const articles = await prisma.article.findMany({
    where: { published: true, status: "published" },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      updatedAt: true,
    },
  });

  const baseUrl = config.baseUrl;
  const now = new Date().toISOString();

  const entries = articles
    .map((article) => {
      const summary =
        article.excerpt || stripHtml(article.content).substring(0, 200);
      return `  <entry>
    <title>${escapeXml(article.title)}</title>
    <link href="${escapeXml(`${baseUrl}/articles/${article.slug}`)}" rel="alternate"/>
    <id>${escapeXml(`${baseUrl}/articles/${article.slug}`)}</id>
    <updated>${article.updatedAt.toISOString()}</updated>
    <summary>${escapeXml(summary)}</summary>
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(config.name)}</title>
  <link href="${escapeXml(baseUrl)}" rel="alternate"/>
  <link href="${escapeXml(`${baseUrl}/feed/atom`)}" rel="self" type="application/atom+xml"/>
  <id>${escapeXml(baseUrl)}</id>
  <updated>${now}</updated>
  <subtitle>${escapeXml(config.description)}</subtitle>
${entries}
</feed>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export const dynamic = "force-dynamic";
