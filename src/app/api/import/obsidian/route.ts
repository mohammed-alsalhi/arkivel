import { NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import prisma from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { parseObsidianVault, parseObsidianFile } from "@/lib/import/obsidian";

export async function POST(request: Request) {
  const disabled = await moduleDisabledResponse("import");
  if (disabled) return disabled;

  const user = await getSession();
  if (!user || !await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const isZip = file.name.endsWith(".zip");

  const notes = isZip
    ? await parseObsidianVault(buffer)
    : [parseObsidianFile(file.name, buffer.toString("utf8"))];

  const categoryId = formData.get("categoryId") as string | null;
  const results: { slug: string; title: string; created: boolean }[] = [];

  for (const note of notes) {
    const existing = await prisma.article.findUnique({ where: { slug: note.slug } });
    if (existing) {
      results.push({ slug: note.slug, title: note.title, created: false });
      continue;
    }

    // Ensure tags exist
    const tagConnections = await Promise.all(
      note.tags.map(async (name) => {
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const tag = await prisma.tag.upsert({
          where: { slug },
          create: { name, slug },
          update: {},
        });
        return { tagId: tag.id };
      })
    );

    await prisma.article.create({
      data: {
        title: note.title,
        slug: note.slug,
        content: note.contentHtml,
        contentRaw: note.content,
        status: "draft",
        published: false,
        userId: user.id,
        categoryId: categoryId ?? undefined,
        tags: tagConnections.length
          ? { create: tagConnections.map((t) => ({ tagId: t.tagId })) }
          : undefined,
      },
    });

    results.push({ slug: note.slug, title: note.title, created: true });
  }

  return NextResponse.json({ imported: results.filter((r) => r.created).length, results });
}

export const dynamic = "force-dynamic";
