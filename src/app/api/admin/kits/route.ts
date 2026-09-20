import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { KITS, kitCollectionSlug, kitStatus } from "@/kits";
import { getEnabledModules } from "@/modules/enabled";
import { requireKitAdmin } from "./_shared";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/kits — every starter kit with, for each, which of its
 * modules are enabled and which of its collections already exist.
 */
export async function GET() {
  const denied = await requireKitAdmin();
  if (denied) return denied;

  const slugs = KITS.flatMap((kit) => kit.collections.map(kitCollectionSlug));
  const [enabled, rows] = await Promise.all([
    getEnabledModules(),
    slugs.length
      ? prisma.collection.findMany({ where: { slug: { in: slugs } }, select: { slug: true } }).catch(() => [])
      : Promise.resolve([]),
  ]);
  const existingSlugs = new Set(rows.map((row) => row.slug));

  return NextResponse.json({
    enabled,
    kits: KITS.map((kit) => kitStatus(kit, { enabled, existingSlugs })),
  });
}
