import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed smoke fixtures.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function upsertCategory(category, parentId = null) {
  return prisma.category.upsert({
    where: { slug: category.slug },
    update: { ...category, parentId },
    create: { ...category, parentId },
  });
}

async function upsertArticle(article, categoryId, userId) {
  return prisma.article.upsert({
    where: { slug: article.slug },
    update: { ...article, categoryId, status: "published", userId },
    create: { ...article, categoryId, status: "published", userId },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(process.env.SMOKE_ADMIN_PASSWORD || "arkivel-smoke-admin", 10);
  const user = await prisma.user.upsert({
    where: { username: "smoke-admin" },
    update: { email: "smoke-admin@example.test", passwordHash, role: "admin" },
    create: { email: "smoke-admin@example.test", passwordHash, role: "admin", username: "smoke-admin" },
  });

  const engineering = await upsertCategory({
    name: "engineering",
    slug: "engineering",
    description: "systems, architecture, and implementation",
    sortOrder: 0,
  });
  const [architecture, decisions] = await Promise.all([
    upsertCategory({ name: "architecture", slug: "architecture", description: "system architecture", sortOrder: 0 }, engineering.id),
    upsertCategory({ name: "decisions", slug: "decisions", description: "architecture decision records", sortOrder: 1 }, engineering.id),
    upsertCategory({ name: "research", slug: "research", description: "technical research", sortOrder: 2 }, engineering.id),
  ]);

  const related = [
    ["system", "system"],
    ["data", "data"],
    ["api", "api"],
    ["model", "model"],
    ["deploy", "deploy"],
    ["security", "security"],
  ];
  await Promise.all(related.map(([slug, title]) => upsertArticle({
    slug,
    title,
    excerpt: `${title} notes for arkivel.`,
    content: `<p>${title} notes for arkivel.</p>`,
    contentRaw: `${title} notes for arkivel.`,
  }, architecture.id, user.id)));

  const article = await upsertArticle({
    slug: "architecture-decisions",
    title: "architecture decisions",
    excerpt: "this page records the key architecture decisions for arkivel. each decision links to its adr and related notes.",
    content: [
      "<p>this page records the key architecture decisions for arkivel.<br>each decision links to its adr and related notes.</p>",
      "<h2>decisions</h2>",
      "<p>adr-001: postgresql as the primary database<br>adr-002: api-first platform<br>adr-003: environment-driven deployment boundaries<br>adr-004: portable export formats</p>",
      "<h2>context</h2>",
      "<p>arkivel is designed to be self-hosted, durable, and straightforward to operate.</p>",
    ].join(""),
    contentRaw: "this page records the key architecture decisions for arkivel.\n\ndecisions\n\nadr-001: postgresql as the primary database\nadr-002: api-first platform\nadr-003: environment-driven deployment boundaries\nadr-004: portable export formats\n\ncontext\n\narkivel is designed to be self-hosted, durable, and straightforward to operate.",
  }, decisions.id, user.id);

  await prisma.articleLink.deleteMany({ where: { sourceId: article.id } });
  await prisma.articleLink.createMany({
    data: related.map(([targetSlug]) => ({ sourceId: article.id, targetSlug, relation: "related-to" })),
  });

  console.log("seeded focused arkivel smoke fixtures");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
