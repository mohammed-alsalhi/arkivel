import { notFound } from "next/navigation";
import ItemPage from "@/components/media/pages/ItemPage";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }) {
  if (config.siteMode !== "media") notFound();
  const [{ id }, { type }] = await Promise.all([params, searchParams]);
  return <ItemPage id={id} type={type} />;
}
