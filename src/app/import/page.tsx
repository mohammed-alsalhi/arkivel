import { requireModule } from "@/modules/enabled";
import MediaImportPage from "@/components/media/pages/ImportPage";
import { config } from "@/lib/config";
import ImportForm from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  if (config.siteMode === "media") return <MediaImportPage />;
  await requireModule("import");
  return <ImportForm />;
}
