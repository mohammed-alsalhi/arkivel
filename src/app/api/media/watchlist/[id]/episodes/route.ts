import { NextRequest, NextResponse } from "next/server";
import { listEpisodes, markEpisodes, unmarkEpisode } from "@/media/library";
import { InputError, episode } from "@/media/validation";
import { mediaRoute, noContent, readBody } from "../../../_handler";

type Context = { params: Promise<{ id: string }> };

/** Watched episode marks for the title, by season then episode. */
export async function GET(_request: NextRequest, context: Context) {
  return mediaRoute(async () => NextResponse.json(await listEpisodes((await context.params).id)));
}

/** Body: `{ episodes: [{ season_number, episode_number }] }` (1–500) — marks them watched; returns the requested marks. */
export async function POST(request: NextRequest, context: Context) {
  return mediaRoute(async () => {
    const { id } = await context.params;
    const input = await readBody(request);
    if (!Array.isArray(input.episodes) || !input.episodes.length || input.episodes.length > 500) throw new InputError("Choose between 1 and 500 episodes.");
    return NextResponse.json(await markEpisodes(id, input.episodes.map(episode)), { status: 201 });
  }, { write: true });
}

/** Body: `{ season_number, episode_number }` — removes that mark; 204 even when it was already absent. */
export async function DELETE(request: NextRequest, context: Context) {
  return mediaRoute(async () => {
    const { id } = await context.params;
    await unmarkEpisode(id, episode(await readBody(request)));
    return noContent();
  }, { write: true });
}

export const dynamic = "force-dynamic";
