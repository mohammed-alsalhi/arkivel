import { NextRequest, NextResponse } from "next/server";
import { importItems, matchTitles } from "@/media/import";
import { importTitles, InputError, newItem } from "@/media/validation";
import { mediaRoute, readBody } from "../_handler";

/** Body: `{ items }` or `{ raw }` (a JSON file's text) — preview matches; nothing is saved. */
export async function POST(request: NextRequest) {
  return mediaRoute(async () => {
    const input = await readBody(request);
    let source: unknown = input.items;
    if (input.raw !== undefined) {
      if (typeof input.raw !== "string") throw new InputError("Upload a JSON text file.");
      try {
        source = JSON.parse(input.raw);
      } catch {
        throw new InputError("This file is not valid JSON.");
      }
    }
    return NextResponse.json(await matchTitles(importTitles(source)));
  });
}

/** Body: `{ items: [watchlist item inputs] }` (1–100) — saves them as plan_to_watch; `{ imported, skipped, items }`. */
export async function PUT(request: NextRequest) {
  return mediaRoute(async () => {
    const input = await readBody(request);
    if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) throw new InputError("Select between 1 and 100 titles to import.");
    return NextResponse.json(await importItems(input.items.map(newItem)));
  }, { write: true });
}

export const dynamic = "force-dynamic";
