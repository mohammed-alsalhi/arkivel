import { requireModule } from "@/modules/enabled";
import { notFound } from "next/navigation";
import { LinkButton, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS, type TrailItem } from "@/lib/trail";
import { canEditCollections } from "@/modules/collections/access";
import { getCollectionBySlug, getItem, listPeople } from "@/modules/collections/queries";
import { COLLECTIONS_CRUMB } from "@/components/collections/CollectionViewPage";
import { ItemForm } from "@/components/collections/ItemForm";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function CollectionItemPage({ params }: Props) {
  await requireModule("collections");
  const { slug, id } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();
  const item = await getItem(collection, id);
  if (!item) notFound();

  const [users, canEdit] = await Promise.all([listPeople(), canEditCollections()]);

  const trail: TrailItem[] = [
    TRAIL_ROOTS.library,
    COLLECTIONS_CRUMB,
    { label: collection.name, href: `/collections/${encodeURIComponent(collection.slug)}` },
    { label: item.title },
  ];

  return (
    <Page
      trail={trail}
      updatedAt={item.updatedAt}
      width="narrow"
      chromeActions={item.article ? <LinkButton href={`/articles/${encodeURIComponent(item.article.slug)}`}>open page</LinkButton> : undefined}
    >
      <PageHeader kicker={collection.name} title={item.title} />
      <ItemForm collection={collection} item={item} users={users} canEdit={canEdit} />
    </Page>
  );
}

export const dynamic = "force-dynamic";
