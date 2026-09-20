import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isKitId } from "@/kits";
import { applyKit, KitError } from "@/kits/apply";
import { CollectionValidationError } from "@/modules/collections/queries";
import { requireKitAdmin } from "../_shared";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/kits/apply — body `{ kit: KitId, seedSampleItems?: boolean }`.
 * Returns the apply report: `{ kit, skin, modulesEnabled, collectionsCreated, collectionsSkipped, itemsCreated }`.
 */
export async function POST(request: NextRequest) {
  const denied = await requireKitAdmin();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const input = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  if (!isKitId(input.kit)) {
    return NextResponse.json({ error: "unknown kit", fields: { kit: "unknown kit" } }, { status: 400 });
  }
  const seedSampleItems = input.seedSampleItems === undefined ? true : input.seedSampleItems === true;

  try {
    const report = await applyKit(input.kit, { seedSampleItems });
    revalidatePath("/collections");
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof KitError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof CollectionValidationError) {
      return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 });
    }
    throw error;
  }
}
