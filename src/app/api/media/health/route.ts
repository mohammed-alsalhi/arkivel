import { NextResponse } from "next/server";
import { libraryHealth } from "@/media/library";
import { canEditCollections } from "@/modules/collections/access";
import { mediaRoute } from "../_handler";

/** `{ mode, catalog, recommendation, sample_library, can_edit }` — configuration, not provider connectivity. */
export async function GET() {
  return mediaRoute(async () => NextResponse.json(await libraryHealth(await canEditCollections())));
}

export const dynamic = "force-dynamic";
