/**
 * Shared wrapper for the Vistara-shaped media routes: module gate, editor gate
 * for writes, known errors → `{ error }`, `Cache-Control: no-store` on the way out.
 */
import { NextResponse } from "next/server";
import { LibraryError } from "@/media/library";
import { InputError, record } from "@/media/validation";
import { requireCollectionEditor } from "@/modules/collections/access";
import { moduleDisabledResponse } from "@/modules/enabled";
import { MediaError } from "@/modules/media/tmdb";
import { readJson } from "../collections/_shared";

export async function mediaRoute(run: () => Promise<NextResponse>, { write = false } = {}): Promise<NextResponse> {
  const disabled = await moduleDisabledResponse("media");
  if (disabled) return disabled;
  if (write) {
    const denied = await requireCollectionEditor();
    if (denied) return denied;
  }
  try {
    const response = await run();
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof InputError || error instanceof LibraryError || error instanceof MediaError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }
}

/** A JSON object body: `application/json` only (415), at most `maxBytes` by content-length (413). */
export async function readBody(request: Request, maxBytes = 1_000_000): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new InputError("Send JSON with Content-Type: application/json.", 415);
  }
  if (Number(request.headers.get("content-length")) > maxBytes) {
    throw new InputError(`This upload is too large. Use a JSON file under ${maxBytes / 1_000_000} MB.`, 413);
  }
  return record(await readJson(request));
}

export const noContent = () => new NextResponse(null, { status: 204 });
