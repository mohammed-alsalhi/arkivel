import { NextRequest, NextResponse } from "next/server";
import { ApiTokenError, revokeApiToken } from "@/lib/api-tokens";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** DELETE /api/tokens/[id] — revoke a token you own (admins may revoke any). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  try {
    const revoked = await revokeApiToken(id, user);
    await logAudit("api_token.revoke", { type: "api_token", id: revoked.id, label: revoked.name }, undefined, { request });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiTokenError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
