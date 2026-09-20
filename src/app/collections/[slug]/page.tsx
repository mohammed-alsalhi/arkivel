import { requireModule } from "@/modules/enabled";
import { CollectionViewPage } from "@/components/collections/CollectionViewPage";

type Props = { params: Promise<{ slug: string }> };

export default async function CollectionPage({ params }: Props) {
  await requireModule("collections");
  const { slug } = await params;
  return <CollectionViewPage slug={slug} />;
}

export const dynamic = "force-dynamic";
