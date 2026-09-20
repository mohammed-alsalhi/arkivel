import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";

/** 401 for anonymous callers, 403 for signed-in non-admins, null for admins. */
export async function requireKitAdmin(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
