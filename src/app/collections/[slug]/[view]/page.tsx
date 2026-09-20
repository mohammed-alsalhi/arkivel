import { requireModule } from "@/modules/enabled";
import { CollectionViewPage } from "@/components/collections/CollectionViewPage";

type Props = { params: Promise<{ slug: string; view: string }> };

export default async function CollectionViewRoute({ params }: Props) {
  await requireModule("collections");
  const { slug, view } = await params;
  return <CollectionViewPage slug={slug} viewSlug={view} />;
}

export const dynamic = "force-dynamic";
