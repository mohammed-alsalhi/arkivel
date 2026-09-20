import { moduleDisabledResponse } from "@/modules/enabled";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCollectionEditor } from "@/modules/collections/access";
import { deleteView, resolveCollection, updateView } from "@/modules/collections/queries";
import { handleRouteError, notFound, readJson } from "../../../_shared";

type Params = { params: Promise<{ id: string; viewId: string }> };

/** Body: any of `{ name, slug, kind, config, isDefault, sortOrder }`. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;

  const { id, viewId } = await params;
  const collection = await resolveCollection(id);
  if (!collection) return notFound();

  const body = await readJson(request);
  try {
    const view = await updateView(collection, viewId, body);
    if (!view) return notFound();
    revalidatePath(`/collections/${collection.slug}`);
    return NextResponse.json(view);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;

  const { id, viewId } = await params;
  const collection = await resolveCollection(id);
  if (!collection) return notFound();

  const result = await deleteView(collection, viewId);
  if (result === "last") return NextResponse.json({ error: "a collection keeps at least one view" }, { status: 400 });
  if (!result) return notFound();
  revalidatePath(`/collections/${collection.slug}`);
  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
