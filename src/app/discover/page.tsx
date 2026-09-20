import { requireModule } from "@/modules/enabled";
import { canEditCollections } from "@/modules/collections/access";
import { hasLiveTmdb } from "@/modules/media/tmdb";
import Discover from "./Discover";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  await requireModule("media");
  const canSave = await canEditCollections();
  return <Discover canSave={canSave} live={hasLiveTmdb()} />;
}
