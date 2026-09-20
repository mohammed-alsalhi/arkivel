import packageJson from "../../package.json";
import { resolveSiteMode } from "./site-mode";

type Env = Record<string, string | undefined>;

export type WikiSkin = "wiki" | "folio";

export function resolveWikiSkin(value: string | undefined): WikiSkin {
  return value === "wiki" ? "wiki" : "folio";
}

function read(env: Env, key: string, fallback: string): string {
  return env[key]?.trim() || fallback;
}

export function createConfig(env: Env) {
  const name = read(env, "NEXT_PUBLIC_ARKIVEL_NAME", "Arkivel");

  return {
    name,
    version: packageJson.version,
    description: read(env, "NEXT_PUBLIC_ARKIVEL_DESCRIPTION", "A focused, self-hosted home for durable knowledge."),
    welcomeText: read(env, "NEXT_PUBLIC_ARKIVEL_WELCOME_TEXT", `Welcome to ${name}.`),
    logo: read(env, "NEXT_PUBLIC_ARKIVEL_LOGO", "/brand/arkivel-logo.png"),
    logoMark: read(env, "NEXT_PUBLIC_ARKIVEL_LOGO_MARK", "/brand/arkivel-logo.svg"),
    appIcon: read(env, "NEXT_PUBLIC_ARKIVEL_APP_ICON", "/brand/arkivel-icon-512.png"),
    baseUrl: read(env, "NEXT_PUBLIC_BASE_URL", "http://localhost:3000"),
    siteMode: resolveSiteMode(env.ARKIVEL_SITE_MODE),
    wikiSkin: resolveWikiSkin(env.NEXT_PUBLIC_ARKIVEL_SKIN),
  };
}

// Next.js only inlines public variables referenced directly at build time.
export const config = createConfig({
  ARKIVEL_SITE_MODE: process.env.ARKIVEL_SITE_MODE,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_ARKIVEL_NAME: process.env.NEXT_PUBLIC_ARKIVEL_NAME,
  NEXT_PUBLIC_ARKIVEL_DESCRIPTION: process.env.NEXT_PUBLIC_ARKIVEL_DESCRIPTION,
  NEXT_PUBLIC_ARKIVEL_WELCOME_TEXT: process.env.NEXT_PUBLIC_ARKIVEL_WELCOME_TEXT,
  NEXT_PUBLIC_ARKIVEL_LOGO: process.env.NEXT_PUBLIC_ARKIVEL_LOGO,
  NEXT_PUBLIC_ARKIVEL_LOGO_MARK: process.env.NEXT_PUBLIC_ARKIVEL_LOGO_MARK,
  NEXT_PUBLIC_ARKIVEL_APP_ICON: process.env.NEXT_PUBLIC_ARKIVEL_APP_ICON,
  NEXT_PUBLIC_ARKIVEL_SKIN: process.env.NEXT_PUBLIC_ARKIVEL_SKIN,
});
