import { moduleDisabledResponse } from "@/modules/enabled";
import { NextRequest, NextResponse } from "next/server";
import { requireCollectionEditor } from "@/modules/collections/access";
import { deleteItem, getItem, resolveCollection, updateItem } from "@/modules/collections/queries";
import { handleRouteError, notFound, readJson } from "../../../_shared";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const { id, itemId } = await params;
  const collection = await resolveCollection(id);
  if (!collection) return notFound();
  const item = await getItem(collection, itemId);
  return item ? NextResponse.json(item) : notFound();
}

/** Body: any of `{ title, properties (merged), articleId, sortOrder }`. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;

  const { id, itemId } = await params;
  const collection = await resolveCollection(id);
  if (!collection) return notFound();

  const body = await readJson(request);
  try {
    const item = await updateItem(collection, itemId, body);
    return item ? NextResponse.json(item) : notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;

  const { id, itemId } = await params;
  const collection = await resolveCollection(id);
  if (!collection) return notFound();

  const removed = await deleteItem(collection, itemId);
  return removed ? NextResponse.json({ success: true }) : notFound();
}

export const dynamic = "force-dynamic";
