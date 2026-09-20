import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeBrowserSessions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  await revokeBrowserSessions();
  const response = NextResponse.json({ success: true });
  // Include chunked NextAuth cookies, which occur when a JWT exceeds 4KB.
  for (const name of ["session_token", ...cookieStore.getAll().map(c => c.name).filter(name => /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(name))]) {
    response.cookies.set(name, "", {
      httpOnly: true, secure: name.startsWith("__Secure-") || request.nextUrl.protocol === "https:",
      sameSite: "lax", path: "/", maxAge: 0,
    });
  }
  return response;
}

export const dynamic = "force-dynamic";
