import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import { isAdmin, requireAdmin } from "@/lib/auth";
import { parseImportFileAll, detectFormat } from "@/lib/import";
import type { ImportResult } from "@/lib/import";
import { generateSlug } from "@/lib/utils";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const disabled = await moduleDisabledResponse("import");
  if (disabled) return disabled;

  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const results: ImportResult[] = [];

  for (const file of files) {
    try {
      const format = detectFormat(file.name);
      if (!format) {
        results.push({
          filename: file.name,
          success: false,
          error: "Unsupported format",
        });
        continue;
      }

      const text = await file.text();
      const articles = parseImportFileAll(file.name, text);

      for (const parsed of articles) {
        let slug = generateSlug(parsed.title);
        const existing = await prisma.article.findUnique({ where: { slug } });
        if (existing) {
          slug = `${slug}-${Date.now().toString(36)}`;
        }

        const article = await prisma.article.create({
          data: {
            title: parsed.title,
            slug,
            content: parsed.content,
            contentRaw: parsed.contentRaw || null,
            excerpt:
              parsed.excerpt ||
              parsed.content.replace(/<[^>]*>/g, "").substring(0, 200),
            published: true,
          },
        });

        results.push({
          filename: file.name,
          success: true,
          title: article.title,
          slug: article.slug,
        });
      }
    } catch (err) {
      results.push({
        filename: file.name,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
    },
  });
}

export const dynamic = "force-dynamic";
