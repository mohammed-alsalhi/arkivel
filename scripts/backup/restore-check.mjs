import "dotenv/config";
import { access, copyFile, lstat, mkdir, readFile, chmod } from "node:fs/promises";
import path from "node:path";
import { checksum, postgresTool, tableCounts } from "./shared.mjs";

try {
  const [directory, output, ...extra] = process.argv.slice(2);
  if (!directory || !output || extra.length) throw new Error("Usage: npm run backup:restore-check -- BACKUP_DIRECTORY NEW_UPLOAD_DIRECTORY");
  const url = process.env.RESTORE_DATABASE_URL;
  if (!url) throw new Error("RESTORE_DATABASE_URL must identify a disposable, empty database");
  const identity = value => { const u = new URL(value); return `${u.hostname}:${u.port || 5432}${u.pathname}`; };
  if (process.env.DATABASE_URL && identity(url) === identity(process.env.DATABASE_URL)) throw new Error("Refusing to restore into the source database");
  const root = path.resolve(directory);
  try { await access(path.join(root, "INCOMPLETE")); throw new Error("Backup is incomplete"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  if (manifest.format !== 1 || !manifest.files?.["database.dump"] || !manifest.tables || typeof manifest.tables !== "object") throw new Error("Unsupported backup manifest");
  for (const [relative, digest] of Object.entries(manifest.files)) {
    if (relative !== "database.dump" && !relative.startsWith("uploads/")) throw new Error("Unexpected backup file");
    if (relative.split(/[\\/]/).some(part => ["", ".", ".."].includes(part))) throw new Error("Invalid backup path");
    const file = path.join(root, relative);
    // Check every parent too; restoring a borrowed archive must not follow symlinks.
    let check = file;
    while (check !== root) { if ((await lstat(check)).isSymbolicLink()) throw new Error("Backup contains a symbolic link"); check = path.dirname(check); }
    if (await checksum(file) !== digest) throw new Error(`Backup checksum mismatch: ${relative}`);
  }
  if (Object.keys(await tableCounts(url)).length) throw new Error("Refusing to restore into a non-empty database");
  await mkdir(path.resolve(output), { mode: 0o700 }); // Never overwrite an existing uploads directory.
  await postgresTool("pg_restore", ["--exit-on-error", "--single-transaction", "--no-owner", "--no-acl", "--dbname", "", path.join(root, "database.dump")], url);
  const restored = await tableCounts(url);
  if (JSON.stringify(restored) !== JSON.stringify(manifest.tables)) throw new Error("Restored table counts differ; ensure writes were stopped during backup");
  for (const relative of Object.keys(manifest.files).filter(name => name.startsWith("uploads/"))) {
    const target = path.join(path.resolve(output), relative.slice("uploads/".length));
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await copyFile(path.join(root, relative), target);
    await chmod(target, 0o600);
    if (await checksum(target) !== manifest.files[relative]) throw new Error("Restored upload checksum mismatch");
  }
  console.log(`Restore verified: ${Object.keys(restored).length} table counts and every included upload checksum match. Disposable database retained for inspection.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
