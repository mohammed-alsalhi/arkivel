import { NextRequest, NextResponse } from "next/server";
import { toSearchResult } from "@/media/detail";
import { InputError, mediaType } from "@/media/validation";
import { searchTitles } from "@/modules/media/tmdb";
import { mediaRoute } from "../_handler";

/** `?q=&type=` — Vistara-shaped search results (trending or the catalogue when `q` is blank). */
export async function GET(request: NextRequest) {
  return mediaRoute(async () => {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length > 300) throw new InputError("Search with fewer than 300 characters.");
    const type = request.nextUrl.searchParams.get("type");
    if (type) mediaType(type);
    const results = (await searchTitles(query)).map(toSearchResult);
    return NextResponse.json(type ? results.filter((item) => item.media_type === type) : results);
  });
}

export const dynamic = "force-dynamic";
