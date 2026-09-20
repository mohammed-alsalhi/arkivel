import { NextResponse } from "next/server";
import { isAdmin, getSession } from "@/lib/auth";

export async function GET() {
  const admin = await isAdmin();
  const session = await getSession();

  return NextResponse.json({
    admin,
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
