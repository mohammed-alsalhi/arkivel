import Link from "next/link";
import GitHubIcon from "./GitHubIcon";

const githubUrl = "https://github.com/mohammed-alsalhi/arkivel";

export default function ProductDocs() {
  return (
    <div className="product-docs-page">
      <header className="product-docs-hero">
        <h1>Install and deploy Arkivel.</h1>
        <p>Set up PostgreSQL, authentication, and deployment.</p>
      </header>
      <div className="product-docs-layout">
        <nav aria-label="Documentation sections">
          <a href="#installation">Installation</a>
          <a href="#configuration">Configuration</a>
          <a href="#authentication">Authentication</a>
          <a href="#deployment">Deployment</a>
          <Link href="/api-docs">API reference</Link>
        </nav>
        <div className="product-docs-content">
          <section id="installation">
            <span>01</span><h2>Installation</h2>
            <p>Arkivel requires Node.js and PostgreSQL. Object storage is only required for file uploads.</p>
            <pre><code>{`git clone https://github.com/mohammed-alsalhi/arkivel.git\ncd arkivel\nnpm install\ncp .env.example .env\nnpm run db:deploy\nnpm run dev`}</code></pre>
          </section>
          <section id="configuration">
            <span>02</span><h2>Configuration</h2>
            <p>Set <code>DATABASE_URL</code>, <code>ADMIN_SECRET</code>, and <code>NEXT_PUBLIC_BASE_URL</code>. Environment variables also control branding, OAuth, and Blob uploads.</p>
            <p>Set <code>ARKIVEL_SITE_MODE=product</code> for a database-free public site; omit it for a wiki.</p>
          </section>
          <section id="authentication">
            <span>03</span><h2>Authentication</h2>
            <p>Set <code>ADMIN_SECRET</code> on every public wiki. Leaving it unset is only safe in local development.</p>
            <p>Multi-user installs support viewer, editor, and admin accounts.</p>
          </section>
          <section id="deployment">
            <span>04</span><h2>Deployment</h2>
            <p>Deploy the Next.js app on Vercel. Apply schema changes with <code>npm run db:deploy</code> (Prisma migrations under <code>prisma/migrations</code>); never <code>prisma db push</code> against an existing database.</p>
            <p>Use one deployment project and database per Arkivel instance. Multiple projects can deploy from the same repository.</p>
          </section>
          <section id="reference">
            <span>05</span><h2>Reference</h2>
            <div className="product-docs-links">
              <a className="product-github-link" href={`${githubUrl}/blob/main/docs/help.md`}><GitHubIcon /> User guide</a>
              <a className="product-github-link" href={`${githubUrl}/blob/main/docs/features.md`}><GitHubIcon /> Feature reference</a>
              <Link href="/api-docs">API reference</Link>
              <a className="product-github-link" href={`${githubUrl}/tree/main/docs`}><GitHubIcon /> Maintainer documentation</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
