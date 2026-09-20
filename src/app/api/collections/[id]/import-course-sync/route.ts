import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import { requireCollectionEditor } from "@/modules/collections/access";
import { resolveCollection } from "@/modules/collections/queries";
import { CourseSyncError } from "@/modules/collections/course-sync";
import { importCourseSync } from "@/modules/collections/course-sync-import";
import { notFound } from "../../_shared";

/** Body: { source: canonical course-sync JSON, dryRun?: boolean }. Preview is the default. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;
  const { id } = await params;
  const collection = await resolveCollection(id);
  if (!collection) return notFound();
  if (Number(request.headers.get("content-length")) > 2_100_000) return NextResponse.json({ error: "import exceeds 2 MB" }, { status: 413 });
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 2_100_000) return NextResponse.json({ error: "import exceeds 2 MB" }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("object required");
  } catch { return NextResponse.json({ error: "body must be a JSON object" }, { status: 400 }); }
  if (body.dryRun !== undefined && typeof body.dryRun !== "boolean") return NextResponse.json({ error: "dryRun must be a boolean" }, { status: 400 });
  try {
    return NextResponse.json(await importCourseSync(collection.id, body.source, body.dryRun !== false));
  } catch (error) {
    if (error instanceof CourseSyncError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}

export const dynamic = "force-dynamic";
