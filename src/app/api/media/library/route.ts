import { NextRequest, NextResponse } from "next/server";
import { parseBackup, previewRestore, restoreBackup } from "@/media/backup";
import { readLibrary, removeSamples } from "@/media/library";
import { mediaRoute, readBody } from "../_handler";

const BACKUP_BYTES = 10_000_000;

/** Downloads the whole library as `vistara-library.json`. */
export async function GET() {
  return mediaRoute(async () =>
    NextResponse.json(await readLibrary(), { headers: { "Content-Disposition": 'attachment; filename="vistara-library.json"' } }),
  );
}

/** Body: `{ backup }` — previews a merge: `{ added, existing, episodesAdded, episodesExisting }`. */
export async function POST(request: NextRequest) {
  return mediaRoute(async () => NextResponse.json(await previewRestore(parseBackup((await readBody(request, BACKUP_BYTES)).backup))), { write: true });
}

/** Body: `{ backup }` — merges it into the library; same counts as the preview. */
export async function PUT(request: NextRequest) {
  return mediaRoute(async () => NextResponse.json(await restoreBackup(parseBackup((await readBody(request, BACKUP_BYTES)).backup))), { write: true });
}

/** Removes untouched starter titles and their marks: `{ removed }`. */
export async function DELETE() {
  return mediaRoute(async () => NextResponse.json({ removed: await removeSamples() }), { write: true });
}

export const dynamic = "force-dynamic";
