import { requireModule } from "@/modules/enabled";
import ObsidianImportForm from "./ObsidianImportForm";

export const dynamic = "force-dynamic";

export default async function ObsidianImportPage() {
  await requireModule("import");
  return <ObsidianImportForm />;
}
