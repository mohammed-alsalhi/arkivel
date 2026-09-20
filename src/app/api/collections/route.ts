import { moduleDisabledResponse } from "@/modules/enabled";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCollectionEditor } from "@/modules/collections/access";
import { createCollection, listCollections } from "@/modules/collections/queries";
import { getTemplate } from "@/modules/collections/templates";
import { handleRouteError, readJson } from "./_shared";

export async function GET() {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  try {
    return NextResponse.json({ collections: await listCollections() });
  } catch {
    return NextResponse.json({ collections: [] });
  }
}

/**
 * Body: `{ name, categoryId?, description?, icon?, template?: "blank" | "tasks" | "reading_list" | "simple_table", schema?, views? }`.
 * A template supplies schema and views unless the body overrides them.
 */
export async function POST(request: NextRequest) {
  const disabled = await moduleDisabledResponse("collections");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;

  const body = await readJson(request);
  const template = body.template === undefined ? getTemplate("blank") : getTemplate(body.template);
  if (!template) return NextResponse.json({ error: "unknown template", fields: { template: "unknown template" } }, { status: 400 });

  try {
    const collection = await createCollection({
      name: typeof body.name === "string" ? body.name : "",
      categoryId: body.categoryId as string | null | undefined,
      description: body.description as string | null | undefined,
      icon: body.icon as string | null | undefined,
      schema: body.schema ?? template.schema,
      views: Array.isArray(body.views) ? (body.views as never) : template.views,
    });
    revalidatePath("/collections");
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export const dynamic = "force-dynamic";
