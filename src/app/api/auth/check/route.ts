import { NextResponse } from "next/server";
import { isAdmin, getSession, registrationAllowed } from "@/lib/auth";

export async function GET() {
  const admin = await isAdmin();
  const session = await getSession();

  return NextResponse.json({
    admin,
    registrationOpen: await registrationAllowed(),
    providers: process.env.NEXTAUTH_SECRET ? [
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? ["google"] : []),
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? ["github"] : []),
    ] : [],
    user: session
      ? {
          id: session.id,
          username: session.username,
          displayName: session.displayName,
          role: session.role,
        }
      : null,
  });
}
