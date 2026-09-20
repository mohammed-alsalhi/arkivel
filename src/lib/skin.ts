import type { WikiSkin } from "./config";

export const SKINS: readonly WikiSkin[] = ["folio", "wiki"];
export const SKIN_COOKIE = "arkivel-skin";
const SKIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const SKIN_LABELS: Record<WikiSkin, { name: string; description: string }> = {
  folio: {
    name: "folio",
    description: "full-viewport document interface with flat surfaces, like a notes app",
  },
  wiki: {
    name: "wiki",
    description: "classic framed wiki with the traditional palette, borders, and tables",
  },
};

export function isWikiSkin(value: unknown): value is WikiSkin {
  return value === "folio" || value === "wiki";
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
