/**
 * A site mode is the shell around one Arkivel deployment: `wiki` (the
 * knowledge base), `product` (the public arkivel.com site and docs), or
 * `media` (a film and series library on the collections engine, Vistara).
 * Modes share the backend, the database, and the admin; they differ in pages
 * and presentation. Skins are a look within the wiki shell; the media shell
 * carries its own.
 */
export type SiteMode = "product" | "wiki" | "media";

export function resolveSiteMode(value: string | undefined): SiteMode {
  return value === "product" || value === "media" ? value : "wiki";
}

const PRODUCT_ROUTES = new Set([
  "/",
  "/api-docs",
  "/api/v1/contract",
  "/api/v1/openapi.json",
  "/api/v1/sdk",
  "/docs",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
]);

export function isProductRouteAllowed(pathname: string): boolean {
  return PRODUCT_ROUTES.has(pathname)
    || pathname.startsWith("/_next/")
    || pathname.startsWith("/_vercel/")
    || pathname.startsWith("/brand/");
}
