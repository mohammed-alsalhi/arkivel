import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { READ_ONLY_MODE_KEY, parseModeEnabled } from "@/lib/maintenance-tooling";

export const dynamic = "force-dynamic";

const KEY = READ_ONLY_MODE_KEY;

export async function GET() {
  try {
    const admin = await isAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const record = await prisma.systemSetting.findUnique({ where: { id: KEY } });
    return NextResponse.json({ enabled: record?.enabled ?? false });
  } catch {
    return NextResponse.json(
      { enabled: false, error: "Read-only mode status is unavailable" },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { enabled } = await request.json();
    const record = await prisma.systemSetting.upsert({
      where: { id: KEY },
      update: { enabled: parseModeEnabled(enabled) },
      create: { id: KEY, enabled: parseModeEnabled(enabled) },
    });
    return NextResponse.json({ enabled: record.enabled });
  } catch {
    return NextResponse.json(
      { error: "Read-only mode could not be updated" },
      { status: 503 },
    );
  }
}
