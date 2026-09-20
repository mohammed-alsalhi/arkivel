/** Application interfaces share the same backend, accounts, and database. */
export type SiteMode = "wiki" | "media";
export function resolveSiteMode(value: string | undefined): SiteMode {
  if (!value || value === "wiki") return "wiki";
  if (value === "media") return "media";
  throw new Error("ARKIVEL_SITE_MODE must be wiki or media. Deploy the marketing website separately.");
}
