import { NextRequest, NextResponse } from "next/server";
import { ApiTokenError, createApiToken, listApiTokens } from "@/lib/api-tokens";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/tokens — the caller's personal access tokens (never the secrets). */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  return NextResponse.json(await listApiTokens(user.id));
}

/** POST /api/tokens — `{ name, expiresInDays: number | null }`; the response carries the token once. */
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const expiresInDays = body.expiresInDays === null || body.expiresInDays === undefined ? null : Number(body.expiresInDays);
  try {
    const created = await createApiToken(user.id, String(body.name ?? ""), expiresInDays);
    await logAudit("api_token.create", { type: "api_token", id: created.id, label: created.name }, { expiresAt: created.expiresAt }, { request });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ApiTokenError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
