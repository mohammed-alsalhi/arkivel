import DiscoverPage from "@/components/media/pages/DiscoverPage";
import { config } from "@/lib/config";
import WikiSearch from "./WikiSearch";

export default function SearchPage() {
  if (config.siteMode === "media") return <DiscoverPage />;
  return <WikiSearch />;
}
