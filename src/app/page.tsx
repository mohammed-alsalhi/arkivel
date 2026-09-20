import LibraryPage from "@/components/media/pages/LibraryPage";
import { config } from "@/lib/config";

export default async function Home() {
  if (config.siteMode === "media") return <LibraryPage />;

  const { default: WikiHome } = await import("@/components/WikiHome");
  return <WikiHome />;
}
