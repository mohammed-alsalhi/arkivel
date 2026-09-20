import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { MAINTENANCE_MODE_KEY, parseModeEnabled } from "@/lib/maintenance-tooling";

export const dynamic = "force-dynamic";

const KEY = MAINTENANCE_MODE_KEY;

/** GET /api/admin/maintenance — get current mode */
export async function GET() {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const record = await prisma.systemSetting.findUnique({ where: { id: KEY } });
  return NextResponse.json({ enabled: record?.enabled ?? false });
}

/** POST /api/admin/maintenance — toggle maintenance mode */
export async function POST(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { enabled } = await request.json();
  const record = await prisma.systemSetting.upsert({
    where: { id: KEY },
    update: { enabled: parseModeEnabled(enabled) },
    create: { id: KEY, enabled: parseModeEnabled(enabled) },
  });
  return NextResponse.json({ enabled: record.enabled });
}
