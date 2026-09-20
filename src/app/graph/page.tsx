import { requireModule } from "@/modules/enabled";
import GraphExplorer from "./GraphExplorer";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  await requireModule("graph");
  return <GraphExplorer />;
}
