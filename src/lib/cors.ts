/**
 * CORS for `/api/**`, opt-in through `ARKIVEL_API_CORS_ORIGINS` (a comma
 * list of origins, or `*`). Credentials are never allowed, so a browser on
 * another origin can only reach the API with a bearer token, never with a
 * visitor's session cookie.
 */
export function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
}

/** The headers to attach for `origin`, or null when the request is not a permitted cross-origin call. */
export function corsHeaders(origin: string | null, allowed: readonly string[]): Record<string, string> | null {
  if (!origin || allowed.length === 0) return null;
  const any = allowed.includes("*");
  if (!any && !allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": any ? "*" : origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Expose-Headers": "Content-Disposition",
    "Access-Control-Max-Age": "86400",
    ...(any ? {} : { Vary: "Origin" }),
  };
}
