import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import pg from "pg";
import bcrypt from "bcryptjs";

const url = new URL(process.env.DATABASE_URL || "postgresql://localhost/missing");
assert(/^\/arkivel_.*(?:test|e2e)/.test(url.pathname), "Use an empty disposable arkivel_*test/e2e database");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const password = "test-only-owner-password";
function setup(username) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/bootstrap-owner.mjs", "--username", username, "--email", `${username}@example.test`], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", reject);
    child.on("close", code => resolve({ code, output }));
    child.stdin.end(password);
  });
}
try {
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM "User"')).rows[0].n, 0, "Database must have no users; this check never deletes data");
  const attempts = await Promise.all([setup("owner_one"), setup("owner_two")]);
  assert.deepEqual(attempts.map(x => x.code).sort(), [0, 1], JSON.stringify(attempts));
  const { rows } = await pool.query('SELECT username, role, "passwordHash" FROM "User"');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].role, "admin");
  assert(await bcrypt.compare(password, rows[0].passwordHash));
  assert.equal((await setup("owner_three")).code, 1);
  console.log("Concurrent owner bootstrap: one administrator; repeat setup rejected.");
} finally {
  await pool.end();
}
