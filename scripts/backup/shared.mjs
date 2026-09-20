import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import pg from "pg";

export async function checksum(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

export async function files(directory, prefix = "") {
  const result = [];
  for (const name of await readdir(directory)) {
    const relative = path.join(prefix, name);
    const full = path.join(directory, name);
    const stat = await lstat(full);
    if (stat.isSymbolicLink()) throw new Error("Backup directories must not contain symbolic links");
    if (stat.isDirectory()) result.push(...await files(full, relative));
    else if (stat.isFile()) result.push(relative);
    else throw new Error("Unsupported file in backup directory");
  }
  return result.sort();
}

export async function tableCounts(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY 1, 2");
    const counts = {};
    for (const { schemaname, tablename } of rows) {
      const quote = value => '"' + value.replaceAll('"', '""') + '"';
      const { rows: [row] } = await client.query(`SELECT count(*)::text AS count FROM ${quote(schemaname)}.${quote(tablename)}`);
      counts[`${schemaname}.${tablename}`] = row.count;
    }
    return counts;
  } finally { await client.end(); }
}

export function postgresTool(command, args, url) {
  return new Promise((resolve, reject) => {
    const connection = new URL(url);
    if (!["postgres:", "postgresql:"].includes(connection.protocol) || connection.pathname.length < 2) throw new Error("Use a PostgreSQL connection URI with an explicit database");
    // libpq's PGDATABASE is a database name, not a URI. Keep credentials out of argv.
    const env = { ...process.env, PGHOST: connection.hostname.replace(/^\[|\]$/g, ""), PGPORT: connection.port || "5432",
      PGDATABASE: decodeURIComponent(connection.pathname.slice(1)), PGUSER: decodeURIComponent(connection.username), PGPASSWORD: decodeURIComponent(connection.password) };
    for (const [option, variable] of Object.entries({ sslmode: "PGSSLMODE", sslrootcert: "PGSSLROOTCERT", sslcert: "PGSSLCERT", sslkey: "PGSSLKEY", options: "PGOPTIONS", connect_timeout: "PGCONNECT_TIMEOUT" })) {
      if (connection.searchParams.has(option)) env[variable] = connection.searchParams.get(option);
    }
    const child = spawn(command, args, { env, stdio: ["ignore", "ignore", "pipe"] });
    child.stderr.resume();
    child.on("error", () => reject(new Error(`${command} could not start; install matching PostgreSQL client tools`)));
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${command} failed (${code}); check database access and client/server versions`)));
  });
}
