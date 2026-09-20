import { requireModule } from "@/modules/enabled";
import AssetLibrary from "./AssetLibrary";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  await requireModule("assets");
  return <AssetLibrary />;
}
