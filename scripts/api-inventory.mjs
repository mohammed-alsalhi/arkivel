// Builds the route inventory the api reference renders: every route handler
// under src/app/api with its methods and the doc comment above each one.
// `node scripts/api-inventory.mjs` rewrites src/lib/api-inventory.json; the
// unit test fails when the file is stale.
import fs from "node:fs";
import path from "node:path";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

function summaryFor(source, method) {
  // The JSDoc (or line comment) immediately above the handler, first sentence, without a leading `METHOD /path —` echo.
  const pattern = new RegExp(`(?:/\\*\\*((?:(?!\\*/)[\\s\\S])*?)\\*/|((?://[^\\n]*\\n)+))\\s*export (?:async )?function ${method}\\b`);
  const match = source.match(pattern);
  const raw = (match?.[1] ?? match?.[2] ?? "").replace(/^\s*(\/\/|\*)\s?/gm, "").replace(/\s+/g, " ").trim();
  return raw.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+\/\S+\s*[—-]\s*/, "").trim() || null;
}

export function buildInventory(root = process.cwd()) {
  const apiDir = path.join(root, "src", "app", "api");
  return walk(apiDir)
    .map((file) => {
      const source = fs.readFileSync(file, "utf8");
      const rel = path.relative(apiDir, path.dirname(file)).split(path.sep).join("/");
      const route = "/api" + (rel ? "/" + rel : "").replace(/\[\.\.\.(\w+)\]/g, "{$1...}").replace(/\[(\w+)\]/g, "{$1}");
      const methods = METHODS.filter((method) => new RegExp(`export (?:async )?function ${method}\\b`).test(source)).map((method) => ({
        method,
        summary: summaryFor(source, method),
      }));
      return { route, methods };
    })
    .filter((entry) => entry.methods.length > 0)
    .sort((a, b) => a.route.localeCompare(b.route));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const inventory = buildInventory();
  fs.writeFileSync(path.join(process.cwd(), "src", "lib", "api-inventory.json"), JSON.stringify(inventory, null, 2) + "\n");
  console.log(`${inventory.length} routes, ${inventory.reduce((sum, entry) => sum + entry.methods.length, 0)} operations`);
}
