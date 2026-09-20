import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createPublicApiV1OpenApiSpec, PUBLIC_API_V1_EXAMPLE_BASE_URL, publicApiV1Contract } from "../src/lib/public-api-v1";
import { sdkMetadataContract } from "../src/lib/sdk-types";
import inventory from "../src/lib/api-inventory.json";
import pkg from "../package.json";
const output = resolve(process.argv[2] || "dist/api-reference");
mkdirSync(output, { recursive: true });
for (const [name, value] of Object.entries({ openapi: createPublicApiV1OpenApiSpec(PUBLIC_API_V1_EXAMPLE_BASE_URL), contract: publicApiV1Contract, sdk: sdkMetadataContract, inventory, source: { version: pkg.version, commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() } })) {
  writeFileSync(join(output, `${name}.json`), JSON.stringify(value, null, 2) + "\n");
}
console.log(`API reference exported to ${output}`);
