import { NextRequest, NextResponse } from "next/server";
import { readLibrary, saveTitle } from "@/media/library";
import { mediaType, moodTags, newItem, watchStatus } from "@/media/validation";
import { mediaRoute, readBody } from "../_handler";

/** `?status=&type=&mood=` — saved titles, each with metadata and episode counts. */
export async function GET(request: NextRequest) {
  return mediaRoute(async () => {
    const params = request.nextUrl.searchParams;
    const status = params.get("status") ? watchStatus(params.get("status")) : undefined;
    const type = params.get("type") ? mediaType(params.get("type")) : undefined;
    const mood = params.get("mood") ? moodTags([params.get("mood")])[0] : undefined;
    const { items } = await readLibrary();
    return NextResponse.json(items.filter((item) => (!status || item.status === status) && (!type || item.media_type === type) && (!mood || item.moods.includes(mood))));
  });
}

/** Body: a watchlist item input — saves it; an existing `(tmdb_id, media_type)` comes back unchanged. */
export async function POST(request: NextRequest) {
  return mediaRoute(async () => {
    const { item } = await saveTitle(newItem(await readBody(request)));
    return NextResponse.json(item, { status: 201 });
  }, { write: true });
}

export const dynamic = "force-dynamic";
