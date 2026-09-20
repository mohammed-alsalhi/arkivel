import { NextResponse, type NextRequest } from "next/server";
import { corsHeaders, parseCorsOrigins } from "@/lib/cors";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cors = pathname.startsWith("/api/") ? corsHeaders(request.headers.get("origin"), corsOrigins) : null;
  if (cors && request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  const response = NextResponse.next({ request });

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  for (const [key, value] of Object.entries(cors ?? {})) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/image|favicon.ico).*)"],
};
