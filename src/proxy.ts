import { NextResponse, type NextRequest } from "next/server";
import { corsHeaders, parseCorsOrigins } from "@/lib/cors";

import { getSession, requireRole } from "@/lib/auth";
import { isPrivateInstance, isPublicEntry } from "@/lib/instance-access";

const corsOrigins = parseCorsOrigins(process.env.ARKIVEL_API_CORS_ORIGINS);

const securityHeaders = {
  "Content-Security-Policy-Report-Only":
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; upgrade-insecure-requests",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "off",
  "X-Frame-Options": "DENY",
} as const;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cors = pathname.startsWith("/api/") ? corsHeaders(request.headers.get("origin"), corsOrigins) : null;
  let response = cors && request.method === "OPTIONS"
    ? new NextResponse(null, { status: 204, headers: cors })
    : NextResponse.next({ request });

  if (isPrivateInstance()) {
    if (request.method === "OPTIONS") response = new NextResponse(null, { status: 204 });
    if (!isPublicEntry(pathname) && request.method !== "OPTIONS") {
      try {
        if (requireRole(await getSession(request), "viewer")) {
          if (pathname.startsWith("/api/") || request.method !== "GET") {
            response = NextResponse.json({ error: "Authentication required" }, { status: 401 });
          } else {
            const login = new URL("/login", request.url);
            login.searchParams.set("next", pathname + request.nextUrl.search);
            response = NextResponse.redirect(login);
          }
        }
      } catch {
        // A database outage must never turn a private instance into a public one.
        response = NextResponse.json({ error: "Authentication temporarily unavailable" }, { status: 503 });
      }
    }
    if (!pathname.startsWith("/_next/static/") && !pathname.startsWith("/brand/")) {
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      response.headers.set("Vary", "Cookie, Authorization");
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
  }

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  for (const [key, value] of Object.entries(cors ?? {})) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ["/:path*"],
};
