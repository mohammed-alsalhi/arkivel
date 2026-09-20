import type { NextConfig } from "next";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

const nextConfig: NextConfig = {
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
