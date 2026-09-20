import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import { isAdmin, requireAdmin } from "@/lib/auth";
import { exportHardeningContract } from "@/lib/export-hardening";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const disabled = await moduleDisabledResponse("export");
  if (disabled) return disabled;

  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const format = request.nextUrl.searchParams.get("format");
  const download = request.nextUrl.searchParams.get("download") === "1";
  const where = format ? { format } : {};

  const history = await prisma.exportHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    where,
  }).catch(() => []);

  const payload = {
    contract: exportHardeningContract,
    history: history.map((item) => ({
      ...item,
      completedAt: item.completedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  };

  if (download) {
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Disposition": `attachment; filename="export-history-${new Date().toISOString().slice(0, 10)}.json"`,
        "Content-Type": "application/json",
      },
    });
  }

  return NextResponse.json(payload);
}
