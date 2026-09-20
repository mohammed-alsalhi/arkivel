import { requireModule } from "@/modules/enabled";
import ExportForm from "./ExportForm";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  await requireModule("export");
  return <ExportForm />;
}
