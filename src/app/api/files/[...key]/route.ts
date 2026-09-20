import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { isPrivateInstance } from "@/lib/instance-access";
import { fileHeaders, getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (isPrivateInstance()) {
    const denied = requireRole(await getSession(), "viewer");
    if (denied) return denied;
  }
  const key = (await params).key.join("/");
  const content = await getStorage().read(key);
  if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new Response(new Uint8Array(content), { headers: fileHeaders(key) });
}
