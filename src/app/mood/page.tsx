import { notFound } from "next/navigation";
import MoodPage from "@/components/media/pages/MoodPage";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function Page() {
  if (config.siteMode !== "media") notFound();
  return <MoodPage />;
}
