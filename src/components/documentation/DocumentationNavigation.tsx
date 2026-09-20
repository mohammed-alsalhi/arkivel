"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { documentationTarget, type DocumentationIndex } from "@/documentation";

export default function DocumentationNavigation({ index, onNavigate }: { index: DocumentationIndex; onNavigate: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = index.pages.find(page => pathname === `/articles/${encodeURIComponent(page.slug)}`);
  const version = current?.version || index.versions.find(v => pathname === `/handbook/${encodeURIComponent(v)}`) || index.versions[0];
  if (!version) return <p className="docs-nav-empty">Published documentation will appear here.</p>;
  const pages = index.pages.filter(page => page.version === version);
  const sections = [...new Set(pages.map(page => page.section))];
  return <div className="docs-navigation">
    <label htmlFor="documentation-version" className="docs-eyebrow">documentation version</label>
    <select id="documentation-version" className="ui-select docs-version" value={version} onChange={event => { router.push(documentationTarget(index, event.target.value, current)); onNavigate(); }}>
      {index.versions.map(v => <option key={v} value={v}>{v}</option>)}
    </select>
    <Link href={`/handbook/${encodeURIComponent(version)}`} className="docs-overview-link" onClick={onNavigate}>Version overview</Link>
    {sections.map(section => <section key={section} className="docs-nav-section" aria-label={section}>
      <h2 className="docs-eyebrow">{section}</h2>
      {pages.filter(page => page.section === section).map(page => <Link key={page.slug} className="docs-nav-link" href={`/articles/${encodeURIComponent(page.slug)}`} aria-current={page.slug === current?.slug ? "page" : undefined} onClick={onNavigate}>{page.title}</Link>)}
    </section>)}
  </div>;
}
