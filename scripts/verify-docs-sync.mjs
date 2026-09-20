import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const required = [
  "README.md",
  "ARCHITECTURE.md",
  "DESIGN.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "docs/index.md",
  "docs/help.md",
  "docs/features.md",
  "docs/api-v1-migration.md",
  "docs/maintainer-guide.md",
  "src/app/help/page.tsx",
  "src/app/features/page.tsx",
  "src/app/api-docs/page.tsx",
];

const missing = required.filter((file) => !fs.existsSync(file));
const versionsMatch = lock.version === packageJson.version
  && lock.packages?.[""]?.version === packageJson.version
  && fs.readFileSync("CHANGELOG.md", "utf8").includes(packageJson.version)
  && fs.readFileSync("ROADMAP.md", "utf8").includes(packageJson.version);

if (missing.length || !versionsMatch) {
  console.error([
    ...missing.map((file) => `missing ${file}`),
    ...(!versionsMatch ? ["version metadata is out of sync"] : []),
  ].join("\n"));
  process.exit(1);
}

console.log(`docs sync passed for ${packageJson.version}`);
