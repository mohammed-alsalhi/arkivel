import { requireModule } from "@/modules/enabled";
import prisma from "@/lib/prisma";
import { Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";
import { canEditCollections } from "@/modules/collections/access";
import { listCollections } from "@/modules/collections/queries";
import { CollectionsIndex } from "@/components/collections/CollectionsIndex";

const TRAIL = [TRAIL_ROOTS.library, { label: "collections" }];

export default async function CollectionsPage() {
  await requireModule("collections");
  const [collections, categories, canEdit] = await Promise.all([
    listCollections().catch(() => []),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }).catch(() => []),
    canEditCollections(),
  ]);

  return (
    <Page trail={TRAIL}>
      <PageHeader
        title="collections"
        description="tables of typed items — tasks, reading lists, trackers — built from templates instead of new features."
      />
      <CollectionsIndex collections={collections} categories={categories} canEdit={canEdit} />
    </Page>
  );
}

export const dynamic = "force-dynamic";
