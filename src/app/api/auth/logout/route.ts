import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  // Clean up session if it exists
  const sessionToken = cookieStore.get("session_token")?.value;
  if (sessionToken) {
    await prisma.session.deleteMany({ where: { token: sessionToken } }).catch(() => {});
  }

  const response = NextResponse.json({ success: true });

  // Clear session token
  response.cookies.set("session_token", "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export const dynamic = "force-dynamic";
