import Link from "next/link";
import { notFound } from "next/navigation";
import { Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS, type TrailItem } from "@/lib/trail";
import { canEditCollections } from "@/modules/collections/access";
import { fallbackView, getCollectionBySlug, listItems, listPeople, pickView } from "@/modules/collections/queries";
import { CollectionTable } from "./CollectionTable";
import { CourseSyncImport } from "./CourseSyncImport";
import { canImportCourseSync } from "@/modules/collections/course-sync";

export const COLLECTIONS_CRUMB: TrailItem = { label: "collections", href: "/collections" };

type Props = { slug: string; viewSlug?: string };

/** Shared by `/collections/[slug]` and `/collections/[slug]/[view]`: resolves the view and renders the table. */
export async function CollectionViewPage({ slug, viewSlug }: Props) {
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const view = pickView(collection, viewSlug) ?? (viewSlug ? null : fallbackView(collection));
  if (!view) notFound();

  const [page, users, canEdit] = await Promise.all([listItems(collection), listPeople(), canEditCollections()]);

  const trail: TrailItem[] = [
    TRAIL_ROOTS.library,
    COLLECTIONS_CRUMB,
    viewSlug ? { label: collection.name, href: `/collections/${encodeURIComponent(collection.slug)}` } : { label: collection.name },
    ...(viewSlug ? [{ label: view.name }] : []),
  ];

  return (
    <Page trail={trail} updatedAt={collection.updatedAt} width="wide">
      <PageHeader
        kicker={
          collection.category ? (
            <Link href={`/categories/${encodeURIComponent(collection.category.slug)}`}>{collection.category.name}</Link>
          ) : (
            "collection"
          )
        }
        title={collection.name}
        description={collection.description ?? undefined}
      />
      <CollectionTable
        key={view.id || view.slug}
        collection={collection}
        view={view}
        page={page}
        users={users}
        canEdit={canEdit}
        importAction={
          canEdit && canImportCourseSync(collection.schema) ? (
            <CourseSyncImport key="course-sync-import" collectionId={collection.id} />
          ) : undefined
        }
      />
    </Page>
  );
}
