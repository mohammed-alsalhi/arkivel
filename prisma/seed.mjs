import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const roots = [
  { name: "engineering", slug: "engineering", description: "systems, architecture, and implementation", sortOrder: 0 },
  { name: "product", slug: "product", description: "product notes and decisions", sortOrder: 1 },
  { name: "company", slug: "company", description: "shared company knowledge", sortOrder: 2 },
];

const engineering = [
  { name: "architecture", slug: "architecture", description: "system architecture", sortOrder: 0 },
  { name: "decisions", slug: "decisions", description: "architecture decision records", sortOrder: 1 },
  { name: "research", slug: "research", description: "technical research", sortOrder: 2 },
];

async function upsertCategory(category, parentId = null) {
  return prisma.category.upsert({
    where: { slug: category.slug },
    update: { ...category, parentId },
    create: { ...category, parentId },
  });
}

async function main() {
  const [engineeringRoot] = await Promise.all(roots.map((category) => upsertCategory(category)));
  await Promise.all(engineering.map((category) => upsertCategory(category, engineeringRoot.id)));
  console.log(`seeded ${roots.length + engineering.length} categories`);
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
