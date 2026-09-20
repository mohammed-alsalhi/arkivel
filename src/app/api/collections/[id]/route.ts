import { moduleDisabledResponse } from "@/modules/enabled";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCollectionEditor } from "@/modules/collections/access";
import { deleteCollection, resolveCollection, updateCollection } from "@/modules/collections/queries";
import { handleRouteError, notFound, readJson } from "../_shared";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const { id } = await params;
  const collection = await resolveCollection(id);
  return collection ? NextResponse.json(collection) : notFound();
}

/** Body: any of `{ name, slug, description, icon, categoryId, schema }`. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;

  const { id } = await params;
  const current = await resolveCollection(id);
  if (!current) return notFound();

  const body = await readJson(request);
  try {
    const collection = await updateCollection(current.id, {
      ...(body.name !== undefined && { name: body.name as string }),
      ...(body.slug !== undefined && { slug: body.slug as string }),
      ...(body.description !== undefined && { description: body.description as string | null }),
      ...(body.icon !== undefined && { icon: body.icon as string | null }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId as string | null }),
      ...(body.schema !== undefined && { schema: body.schema }),
    });
    if (!collection) return notFound();
    revalidatePath("/collections");
    revalidatePath(`/collections/${collection.slug}`);
    return NextResponse.json(collection);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;

  const { id } = await params;
  const current = await resolveCollection(id);
  if (!current) return notFound();

  await deleteCollection(current.id);
  revalidatePath("/collections");
  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
