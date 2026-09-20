import { requireModule } from "@/modules/enabled";
import NotionImportForm from "./NotionImportForm";

export const dynamic = "force-dynamic";

export default async function NotionImportPage() {
  await requireModule("import");
  return <NotionImportForm />;
}
