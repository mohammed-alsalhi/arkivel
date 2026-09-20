import Link from "next/link";
import { notFound } from "next/navigation";
import { config } from "@/lib/config";
import { isAdmin } from "@/lib/auth";
import { Page, LinkButton } from "@/components/ui";
import { getDocumentationIndex } from "@/documentation/queries";

export default async function DocumentationHome({ version }: { version?: string }) {
  const index = await getDocumentationIndex();
  const selected = version || index.versions[0];
  if (version && !index.versions.includes(version)) notFound();
  const pages = index.pages.filter(page => page.version === selected);
  const sections = [...new Set(pages.map(page => page.section))];
  const admin = await isAdmin();
  return <Page width="wide" trail={[{ label: "documentation", href: "/" }, ...(selected ? [{ label: selected }] : [])]}>
    <div className="docs-home">
      <header className="docs-hero">
        <div className="docs-eyebrow">{selected || "documentation"} <span aria-hidden="true">/</span> {pages.length} published pages</div>
        <h1>{config.name}<br /><span>the field guide.</span></h1>
        <p>{config.description}</p>
        {pages[0] && <LinkButton href={`/articles/${encodeURIComponent(pages[0].slug)}`} variant="primary">Start reading <span aria-hidden="true">↗</span></LinkButton>}
      </header>
      {pages.length === 0 ? <section className="docs-empty">
        <h2>A home for your documentation.</h2>
        <p>No documentation has been published yet.</p>
        {admin && <><p>Apply the documentation starter kit, then link published articles in its collection. Set a version, section, reading order, and a matching topic key across versions.</p><LinkButton href="/admin/kits">Set up documentation</LinkButton></>}
      </section> : <div className="docs-section-grid">{sections.map((section, i) => <section className="docs-section" key={section}>
        <div className="docs-section-number">{String(i + 1).padStart(2, "0")}</div>
        <h2>{section}</h2>
        {pages.filter(page => page.section === section).map(page => <Link className="docs-page-link" key={page.slug} href={`/articles/${encodeURIComponent(page.slug)}`}>
          <span><strong>{page.title}</strong>{page.excerpt && <span>{page.excerpt}</span>}</span><span aria-hidden="true">↗</span>
        </Link>)}
      </section>)}</div>}
      <footer className="docs-home-footer"><span>Built to be read. Kept up to date.</span><Link href="/search">Search the knowledge base</Link>{admin && <Link href="/collections/documentation">Manage the index</Link>}</footer>
    </div>
  </Page>;
}
