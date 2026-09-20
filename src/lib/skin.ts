import { WIKI_SKINS, type WikiSkin } from "./config";

export const SKINS: readonly WikiSkin[] = WIKI_SKINS;
export const SKIN_COOKIE = "arkivel-skin";
const SKIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const SKIN_LABELS: Record<WikiSkin, { name: string; description: string }> = {
  editorial: { name: "editorial", description: "warm paper, generous reading space, and expressive serif typography" },
  compact: { name: "compact", description: "a dense workspace with a narrow rail, wide tables, and crisp blue accents" },
  folio: {
    name: "folio",
    description: "full-viewport document interface with flat surfaces, like a notes app",
  },
  wiki: {
    name: "wiki",
    description: "classic wiki with the traditional palette, borders, and tables",
  },
};

export function isWikiSkin(value: unknown): value is WikiSkin {
  return typeof value === "string" && (SKINS as readonly string[]).includes(value);
}

/** Switch the live document to a skin and persist it in the skin cookie. */
export function applySkin(skin: WikiSkin) {
  document.documentElement.setAttribute("data-skin", skin);
  document.cookie = `${SKIN_COOKIE}=${skin}; path=/; max-age=${SKIN_COOKIE_MAX_AGE}; samesite=lax`;
}

export function currentSkin(): WikiSkin {
  const value = document.documentElement.getAttribute("data-skin");
  return isWikiSkin(value) ? value : "folio";
}
