import { notFound } from "next/navigation";
import { config } from "@/lib/config";
import DocumentationHome from "@/components/documentation/DocumentationHome";
export default async function VersionPage({ params }: { params: Promise<{ version: string }> }) {
  if (config.siteMode !== "docs") notFound();
  return <DocumentationHome version={(await params).version} />;
}
export const dynamic = "force-dynamic";
