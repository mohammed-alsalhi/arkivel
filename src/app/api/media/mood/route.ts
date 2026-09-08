import { NextRequest, NextResponse } from "next/server";
import { pickForMood } from "@/media/mood";
import { integer, text } from "@/media/validation";
import { mediaRoute, readBody } from "../_handler";

/** Body: `{ mood, count? }` — `{ mood, source, message, recommendations }` from the unwatched library. */
export async function POST(request: NextRequest) {
  return mediaRoute(async () => {
    const input = await readBody(request);
    const mood = text(input.mood, "Mood", 500);
    const count = input.count === undefined ? 5 : integer(input.count, "Number of picks", 1, 12);
    return NextResponse.json(await pickForMood(mood, count));
  });
}

export const dynamic = "force-dynamic";
