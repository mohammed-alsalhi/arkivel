import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";

/**
 * Who may change collections: admins always (including the no-secret local-dev case
 * `isAdmin()` covers), and any signed-in member with the editor role. Reads are public,
 * matching the wiki's public-read behaviour for articles.
 */
export async function canEditCollections(): Promise<boolean> {
  if (await isAdmin()) return true;
  const session = await getSession();
  return !!session && (session.role === "editor" || session.role === "admin");
}

/** 401 for anonymous callers, 403 for signed-in viewers, null when allowed. */
export async function requireCollectionEditor(): Promise<NextResponse | null> {
  if (await canEditCollections()) return null;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
}
