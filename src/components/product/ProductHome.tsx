import Image from "next/image";
import Link from "next/link";
import GitHubIcon from "@/components/product/GitHubIcon";

const githubUrl = "https://github.com/mohammed-alsalhi/arkivel";

const docs = [
  ["01", "installation", "/docs#installation"],
  ["02", "configuration", "/docs#configuration"],
  ["03", "authentication", "/docs#authentication"],
  ["04", "deployment", "/docs#deployment"],
  ["05", "api reference", "/api-docs"],
] as const;

export default function ProductHome() {
  return (
    <div className="product-home">
      <section className="product-hero" aria-labelledby="product-hero-title">
        <div className="product-hero-copy">
          <h1 id="product-hero-title">knowledge that stays yours.</h1>
          <p>an open-source, self-hosted wiki for writing, linking, and searching durable documentation.</p>
          <div className="product-hero-actions">
            <a className="product-text-link" href={githubUrl}><GitHubIcon /> source code</a>
            <Link className="product-text-link" href="/docs#installation">installation</Link>
          </div>
        </div>

        <figure className="product-preview">
          <Image
            src="/brand/arkivel-wiki.png"
            alt="arkivel article reader with navigation and a linked-page graph"
            width={1644}
            height={1130}
            priority
          />
        </figure>
      </section>

      <section id="product" className="product-proof-rail" aria-label="arkivel overview">
        <h2>focused knowledge infrastructure.</h2>
        <div><strong>self-hosted</strong><span>next.js and postgresql.</span></div>
        <div><strong>focused editor</strong><span>wiki links, tables, code, and images.</span></div>
        <div><strong>portable</strong><span>imports, exports, and a public read api.</span></div>
      </section>

      <section className="product-docs-cta" aria-labelledby="docs-cta-title">
        <div className="product-docs-copy">
          <h2 id="docs-cta-title">install and configure arkivel.</h2>
          <p>the setup, security, deployment, and api details live in the documentation.</p>
        </div>
        <nav className="product-docs-index" aria-label="documentation index">
          {docs.map(([number, label, href]) => (
            <Link href={href} key={number}><span>{number}</span><strong>{label}</strong></Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
