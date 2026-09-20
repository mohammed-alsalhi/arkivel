import Link from "next/link";
import { getDocumentationIndex } from "@/documentation/queries";

export default async function DocumentationPager({ slug }: { slug: string }) {
  const index = await getDocumentationIndex();
  const current = index.pages.find(page => page.slug === slug);
  if (!current) return null;
  const pages = index.pages.filter(page => page.version === current.version);
  const position = pages.findIndex(page => page.slug === slug);
  return <nav className="docs-pager" aria-label="Documentation reading order">
    {[{ label: "Previous", page: pages[position - 1] }, { label: "Next", page: pages[position + 1] }].map(({ label, page }) => page ? <Link key={label} href={`/articles/${encodeURIComponent(page.slug)}`} rel={label === "Next" ? "next" : "prev"}><span>{label} · {current.version}</span><strong>{page.title}</strong></Link> : <span key={label} />)}
  </nav>;
}
