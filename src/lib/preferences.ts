import type { WikiSkin } from "./config";
import { isWikiSkin } from "./skin";

export const DEFAULT_PREFERENCES = {
  // "" = follow the site default (config.wikiSkin); otherwise a named skin.
  skin: "" as "" | WikiSkin,
};

export type UserPreferences = typeof DEFAULT_PREFERENCES;

/** Merge saved (partial) preferences with defaults; unknown skins follow the site default. */
export function mergePreferences(saved: Partial<UserPreferences>): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    skin: isWikiSkin(saved.skin) ? saved.skin : "",
  };
}
