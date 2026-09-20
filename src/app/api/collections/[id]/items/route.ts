import { moduleDisabledResponse } from "@/modules/enabled";
import { NextRequest, NextResponse } from "next/server";
import { requireCollectionEditor } from "@/modules/collections/access";
import { createItem, listItems, resolveCollection } from "@/modules/collections/queries";
import { handleRouteError, notFound, readJson } from "../../_shared";

type Params = { params: Promise<{ id: string }> };

/** `?page=1&q=title` — 100 items a page, ordered by sortOrder then creation. */
export async function GET(request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const { id } = await params;
  const collection = await resolveCollection(id);
  if (!collection) return notFound();

  const page = Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  return NextResponse.json(await listItems(collection, { page: Number.isFinite(page) ? page : 1, q }));
}

/** Body: `{ title, properties?, articleId?, sortOrder? }`. */
export async function POST(request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;

  const { id } = await params;
  const collection = await resolveCollection(id);
  if (!collection) return notFound();

  const body = await readJson(request);
  try {
    const item = await createItem(collection, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export const dynamic = "force-dynamic";
