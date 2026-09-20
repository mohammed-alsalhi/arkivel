import type { Metadata } from "next";
import ProductDocs from "@/components/product/ProductDocs";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Install, configure, secure, and deploy Arkivel.",
};

export default function DocsPage() {
  return <ProductDocs />;
}
