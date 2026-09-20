/** Unknown values fail closed; the default preserves public wiki behavior. */
export function isPrivateInstance() {
  const access = process.env.ARKIVEL_ACCESS;
  return access !== undefined && access !== "public";
}

export function isPublicEntry(path: string) {
  return ["/login", "/register", "/api/health", "/robots.txt", "/favicon.ico", "/manifest.webmanifest"].includes(path)
    || path.startsWith("/api/auth/") || path.startsWith("/_next/static/") || path.startsWith("/brand/");
}

/** Login redirects must stay on this origin, even with encoded slashes. */
export function loginDestination(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\r\n]/.test(decoded)) return "/";
    const url = new URL(value, "https://arkivel.invalid");
    return url.origin === "https://arkivel.invalid" ? url.pathname + url.search : "/";
  } catch { return "/"; }
}
