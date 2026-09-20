import { NextRequest, NextResponse } from "next/server";
import { patchTitle, removeTitle } from "@/media/library";
import { InputError, moodTags, watchStatus } from "@/media/validation";
import { mediaRoute, noContent, readBody } from "../../_handler";

type Context = { params: Promise<{ id: string }> };

/** Body: `{ status?, moods? }` (at least one) — updates the title; `watched` stamps a missing watched date. */
export async function PATCH(request: NextRequest, context: Context) {
  return mediaRoute(async () => {
    const { id } = await context.params;
    const input = await readBody(request);
    if (input.status === undefined && input.moods === undefined) throw new InputError("Choose a status or mood to update.");
    const status = input.status === undefined ? undefined : watchStatus(input.status);
    const moods = input.moods === undefined ? undefined : moodTags(input.moods);
    return NextResponse.json(await patchTitle(id, { status, moods }));
  }, { write: true });
}

/** Removes the title and its episode marks; 404 when it is already gone. */
export async function DELETE(_request: NextRequest, context: Context) {
  return mediaRoute(async () => {
    await removeTitle((await context.params).id);
    return noContent();
  }, { write: true });
}

export const dynamic = "force-dynamic";
