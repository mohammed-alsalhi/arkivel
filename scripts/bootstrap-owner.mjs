import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import pg from "pg";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { username: { type: "string" }, email: { type: "string" } } });
const username = values.username;
const email = values.email?.trim().toLowerCase();
if (!process.env.DATABASE_URL || !username || !/^[a-zA-Z0-9_]{3,30}$/.test(username) || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || process.stdin.isTTY) {
  console.error("Provide DATABASE_URL, --username (3–30 letters/numbers/underscores), --email, and a password on stdin.");
  process.exit(1);
}
let password = "";
for await (const chunk of process.stdin) {
  password += chunk;
  if (Buffer.byteLength(password, "utf8") > 74) { console.error("Password too long."); process.exit(1); }
}
password = password.replace(/\r?\n$/, "");
if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
  console.error("Password must be at least 12 characters and at most 72 UTF-8 bytes.");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async tx => {
    // Serialize competing operator setup commands before checking for an owner.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(1095912278, 1)`;
    if (await tx.user.findFirst({ where: { role: "admin" }, select: { id: true } })) throw new Error("An administrator already exists; use the existing account.");
    if (await tx.user.findFirst({ where: { OR: [{ username }, { email: { equals: email, mode: "insensitive" } }] }, select: { id: true } })) throw new Error("Username or email is already registered; no existing account was changed.");
    await tx.user.create({ data: { username, email, passwordHash, displayName: username, role: "admin" } });
  });
  console.log("Owner created. Sign in with the chosen username and password.");
} catch (error) {
  console.error(error instanceof Error && !('code' in error) ? error.message : "Owner setup failed; no owner was created.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
