import "dotenv/config";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";

const source = new URL(process.env.DATABASE_URL || "");
if (!/^\/arkivel_(e2e|private_test_|backup_test_)/.test(source.pathname)) throw new Error("Rehearsal requires a named Arkivel test database");
const name = `arkivel_restore_check_${randomUUID().replaceAll("-", "")}`;
const target = new URL(source); target.pathname = `/${name}`;
const root = await mkdtemp(path.join(os.tmpdir(), "arkivel-backup-check-"));
const admin = new pg.Client({ connectionString: source.href });
await admin.connect();
let created = false;
try {
  await admin.query(`CREATE DATABASE "${name}"`); created = true;
  const uploadRoot = path.join(root, "source-uploads");
  await mkdir(path.join(uploadRoot, "assets"), { recursive: true });
  const key = "assets/12345678-1234-1234-1234-123456789012.txt";
  await writeFile(path.join(uploadRoot, key), "restore me exactly\n");
  const env = { ...process.env, DATABASE_URL: source.href, RESTORE_DATABASE_URL: target.href, ARKIVEL_STORAGE: "local", ARKIVEL_UPLOAD_DIR: uploadRoot };
  const run = (script, args) => execFileSync(process.execPath, [script, ...args], { env, stdio: ["ignore", "pipe", "pipe"] }).toString();
  const snapshot = path.join(root, "snapshot");
  console.log(run("scripts/backup/create.mjs", [snapshot]).trim());
  console.log(run("scripts/backup/restore-check.mjs", [snapshot, path.join(root, "restored-uploads")]).trim());
  if (await readFile(path.join(root, "restored-uploads", key), "utf8") !== "restore me exactly\n") throw new Error("Upload differs after restore");
  const restored = new pg.Client({ connectionString: target.href }); await restored.connect();
  try {
    const query = 'SELECT username, email, "passwordHash", role FROM "User" ORDER BY id';
    if (JSON.stringify((await admin.query(query)).rows) !== JSON.stringify((await restored.query(query)).rows)) throw new Error("Restored credentials differ");
    const articleQuery = 'SELECT slug, content FROM "Article" ORDER BY id';
    if (JSON.stringify((await admin.query(articleQuery)).rows) !== JSON.stringify((await restored.query(articleQuery)).rows)) throw new Error("Restored article content differs");
  } finally { await restored.end(); }
  let refused = false;
  try { run("scripts/backup/restore-check.mjs", [snapshot, path.join(root, "must-not-exist")]); } catch { refused = true; }
  if (!refused) throw new Error("Restore failed to reject an existing database");
  await writeFile(path.join(snapshot, "uploads", key), "tampered");
  refused = false;
  try { run("scripts/backup/restore-check.mjs", [snapshot, path.join(root, "tampered-output")]); } catch { refused = true; }
  if (!refused) throw new Error("Restore failed to reject a corrupt backup");
  console.log("Backup rehearsal passed: articles, credentials, and uploads match; overwrite and corruption guards pass.");
} finally {
  if (created) await admin.query(`DROP DATABASE "${name}"`); // Only the unique database created by this process.
  await admin.end();
  await rm(root, { recursive: true, force: true });
}
