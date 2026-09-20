import "dotenv/config";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { checksum, files, postgresTool, tableCounts } from "./shared.mjs";

try {
  const args = process.argv.slice(2);
  const databaseOnly = args.includes("--database-only");
  const destinations = args.filter(arg => arg !== "--database-only");
  if (destinations.length !== 1 || destinations[0].startsWith("-")) throw new Error("Usage: npm run backup -- NEW_DIRECTORY [--database-only]");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const provider = process.env.ARKIVEL_STORAGE || (process.env.BLOB_READ_WRITE_TOKEN ? "vercel" : "local");
  if (provider !== "local" && !databaseOnly) throw new Error("Remote storage needs its own object backup; use --database-only explicitly");
  const destination = path.resolve(destinations[0]);
  const source = path.resolve(process.env.ARKIVEL_UPLOAD_DIR || "data/uploads");
  if (destination === source || destination.startsWith(source + path.sep)) throw new Error("Backup destination cannot be inside uploads");
  await mkdir(destination, { mode: 0o700 }); // Refuse existing destinations, including symlinks.
  await writeFile(path.join(destination, "INCOMPLETE"), "Backup has not completed.\n", { mode: 0o600 });
  const counts = await tableCounts(process.env.DATABASE_URL);
  const dump = path.join(destination, "database.dump");
  await postgresTool("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", dump], process.env.DATABASE_URL);
  await chmod(dump, 0o600);
  const inventory = { "database.dump": await checksum(dump) };
  if (!databaseOnly) {
    let uploads;
    try { uploads = await files(source); } catch (error) { if (error.code === "ENOENT") uploads = []; else throw error; }
    for (const file of uploads) {
      const relative = path.join("uploads", file);
      const target = path.join(destination, relative);
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await copyFile(path.join(source, file), target);
      await chmod(target, 0o600);
      inventory[relative] = await checksum(target);
    }
  }
  const { version } = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  await writeFile(path.join(destination, "manifest.json"), JSON.stringify({ format: 1, version, createdAt: new Date().toISOString(), scope: databaseOnly ? "database-only" : "database-and-local-uploads", tables: counts, files: inventory }, null, 2) + "\n", { mode: 0o600 });
  const { unlink } = await import("node:fs/promises");
  await unlink(path.join(destination, "INCOMPLETE"));
  console.log(`Backup complete: ${Object.keys(counts).length} tables, ${Object.keys(inventory).length} files (${databaseOnly ? "database only; remote objects not included" : "database and local uploads"}).`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
