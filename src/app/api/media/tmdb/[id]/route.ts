import { NextRequest, NextResponse } from "next/server";
import { titleDetail } from "@/media/detail";
import { integer, mediaType } from "@/media/validation";
import { mediaRoute } from "../../_handler";

/** `?type=movie|tv&seasons=1` — `{ tmdb, ratings, seasons?, source, episode_scope? }`. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return mediaRoute(async () => {
    const { id } = await context.params;
    const tmdbId = integer(Number(id), "TMDB ID");
    const type = mediaType(request.nextUrl.searchParams.get("type"));
    return NextResponse.json(await titleDetail(type, tmdbId, request.nextUrl.searchParams.get("seasons") === "1"));
  });
}

export const dynamic = "force-dynamic";
