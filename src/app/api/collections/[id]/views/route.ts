import { moduleDisabledResponse } from "@/modules/enabled";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCollectionEditor } from "@/modules/collections/access";
import { createView, resolveCollection } from "@/modules/collections/queries";
import { handleRouteError, notFound, readJson } from "../../_shared";

type Params = { params: Promise<{ id: string }> };

/** Body: `{ name, slug?, kind?, config?, isDefault? }`. */
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
    const view = await createView(collection, body);
    revalidatePath(`/collections/${collection.slug}`);
    return NextResponse.json(view, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export const dynamic = "force-dynamic";
