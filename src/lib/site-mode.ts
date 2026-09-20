/** Application interfaces share the same backend, accounts, and database. */
export type SiteMode = "wiki" | "media" | "docs";
export function resolveSiteMode(value: string | undefined): SiteMode {
  if (!value || value === "wiki") return "wiki";
  if (value === "docs") return "docs";
  if (value === "media") return "media";
  throw new Error("ARKIVEL_SITE_MODE must be wiki, media, or docs. Deploy the marketing website separately.");
}
