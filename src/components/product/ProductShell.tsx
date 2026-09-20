import type { ReactNode } from "react";
import Link from "next/link";
import BrandMark from "@/components/brand/BrandMark";
import GitHubIcon from "@/components/product/GitHubIcon";

const githubUrl = "https://github.com/mohammed-alsalhi/arkivel";

export default function ProductShell({ children }: { children: ReactNode }) {
  return (
    <div className="product-site-shell">
      <header className="product-site-header">
        <div className="product-site-header-inner">
          <Link href="/" className="product-site-brand" aria-label="Arkivel home">
            <BrandMark className="product-site-brand-mark" imageSize={32} priority />
            <span>Arkivel</span>
          </Link>
          <nav className="product-site-nav" aria-label="Product navigation">
            <Link href="/#product">Overview</Link>
            <Link href="/docs">Docs</Link>
            <a className="product-github-link" href={githubUrl} aria-label="GitHub"><GitHubIcon /></a>
          </nav>
        </div>
      </header>
      <main id="main-content" className="product-site-main">{children}</main>
      <footer className="product-site-footer">
        <div className="product-site-footer-inner">
          <Link href="/" className="product-site-brand product-site-footer-brand">
            <BrandMark className="product-site-brand-mark" imageSize={28} />
            <span>Arkivel</span>
          </Link>
          <nav aria-label="Footer navigation">
            <Link href="/#product">Overview</Link>
            <Link href="/docs">Docs</Link>
            <a className="product-github-link" href={githubUrl} aria-label="GitHub"><GitHubIcon /></a>
            <a className="product-github-link" href={`${githubUrl}/blob/main/LICENSE`}><GitHubIcon /> MIT License</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
