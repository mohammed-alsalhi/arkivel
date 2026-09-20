import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";
import { parseImportFileAll, detectFormat } from "../src/lib/import";
import { generateSlug } from "../src/lib/utils";

const args = process.argv.slice(2);
const folderArg = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const draft = args.includes("--draft");
const categoryFlag = args.find((a) => a.startsWith("--category="));
const categorySlug = categoryFlag?.split("=")[1] || null;

if (!folderArg) {
  console.error(
    "Usage: npx tsx scripts/import-articles.ts <folder> [--draft] [--category=slug] [--dry-run]"
  );
  process.exit(1);
}

const folder = path.resolve(folderArg);

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
      throw new Error(`Not a directory: ${folder}`);
    }

    let categoryId: string | null = null;
    if (categorySlug) {
      const cat = await prisma.category.findUnique({
        where: { slug: categorySlug },
      });
      if (!cat) throw new Error(`Category not found: ${categorySlug}`);
      categoryId = cat.id;
    }

    const files = fs
      .readdirSync(folder)
      .filter((f) => detectFormat(f) !== null);

    console.log(`Found ${files.length} importable files in ${folder}`);
    if (files.length === 0) return;

    let success = 0;
    let failed = 0;

    for (const filename of files) {
      try {
        const filepath = path.join(folder, filename);
        const content = fs.readFileSync(filepath, "utf-8");
        const articles = parseImportFileAll(filename, content);

        for (const parsed of articles) {
          let slug = generateSlug(parsed.title);
          const existing = await prisma.article.findUnique({
            where: { slug },
          });
          if (existing) {
            slug = `${slug}-${Date.now().toString(36)}`;
          }

          if (dryRun) {
            console.log(
              `[DRY RUN] Would import: "${parsed.title}" (${slug}) from ${filename}`
            );
          } else {
            await prisma.article.create({
              data: {
                title: parsed.title,
                slug,
                content: parsed.content,
                contentRaw: parsed.contentRaw || null,
                excerpt:
                  parsed.excerpt ||
                  parsed.content.replace(/<[^>]*>/g, "").substring(0, 200),
                published: !draft,
                categoryId,
              },
            });
            console.log(`Imported: "${parsed.title}" -> /articles/${slug}`);
          }
          success++;
        }
      } catch (err) {
        console.error(
          `Failed: ${filename} - ${err instanceof Error ? err.message : err}`
        );
        failed++;
      }
    }

    console.log(`\nDone. ${success} imported, ${failed} failed.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
