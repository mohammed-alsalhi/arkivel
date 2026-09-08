"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LocalGraph from "@/components/LocalGraph";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useScrollLock } from "@/lib/useScrollLock";
import { useModuleEnabled } from "@/modules/client";

type BacklinkItem = { id: string; title: string; slug: string };
type HeadingItem = { id: string; text: string; level: number };
type Panel = "graph" | "outline";

export default function ArticleRightSidebar({
  slug,
  backlinks,
}: {
  slug: string;
  backlinks: BacklinkItem[];
}) {
  // The graph tab belongs to the graph module; without it the rail is outline-only.
  const graphEnabled = useModuleEnabled("graph");
  const [panel, setPanel] = useState<Panel>(graphEnabled ? "graph" : "outline");
  const showGraph = graphEnabled && panel === "graph";
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  useScrollLock(mobileOpen);
  useFocusTrap(asideRef, mobileOpen);

  useEffect(() => {
    const article = document.querySelector(".article-reader-content");
    if (!article) return;

    const updateHeadings = () => {
      const next = Array.from(article.querySelectorAll("h1, h2, h3, h4"))
        .map((element) => ({
          id: element.id,
          text: element.textContent?.trim() || "",
          level: Number.parseInt(element.tagName.slice(1), 10),
        }))
        .filter((heading) => heading.id && heading.text);
      setHeadings(next);
    };

    updateHeadings();
    const observer = new MutationObserver(updateHeadings);
    observer.observe(article, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [slug]);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      <button
        type="button"
        className="article-context-toggle"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Close page context" : "Open page context"}
        aria-expanded={mobileOpen}
        aria-controls="article-context"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="14" y1="3" x2="14" y2="21" />
        </svg>
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="article-context-backdrop"
          aria-label="Close page context"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        ref={asideRef}
        id="article-context"
        className={`wiki-right-sidebar${mobileOpen ? " wiki-right-sidebar-open" : ""}`}
        aria-label="Page context"
        // As a mobile drawer this covers the page, so it becomes a modal dialog.
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
      >
        <div className="article-context-tabs" role="tablist" aria-label="Page context views">
          {graphEnabled && (
            <button
              type="button"
              id="article-context-graph-tab"
              role="tab"
              aria-selected={showGraph}
              aria-controls="article-context-graph"
              className={showGraph ? "article-context-tab-active" : undefined}
              onClick={() => setPanel("graph")}
            >
              graph
            </button>
          )}
          <button
            type="button"
            id="article-context-outline-tab"
            role="tab"
            aria-selected={!showGraph}
            aria-controls="article-context-outline"
            className={!showGraph ? "article-context-tab-active" : undefined}
            onClick={() => setPanel("outline")}
          >
            outline
          </button>
        </div>

        {showGraph ? (
          <div
            id="article-context-graph"
            role="tabpanel"
            aria-labelledby="article-context-graph-tab"
            className="article-context-panel article-context-graph"
          >
            <LocalGraph slug={slug} />
          </div>
        ) : (
          <div
            id="article-context-outline"
            role="tabpanel"
            aria-labelledby="article-context-outline-tab"
            className="article-context-panel article-context-outline"
          >
            <nav aria-label="Page outline">
              {headings.length === 0 ? (
                <p className="article-context-empty">no headings found.</p>
              ) : (
                <ol>
                  {headings.map((heading) => (
                    <li key={heading.id} style={{ paddingInlineStart: `${Math.max(0, heading.level - 2) * 0.9}rem` }}>
                      <a
                        href={`#${heading.id}`}
                        aria-current={activeId === heading.id ? "location" : undefined}
                        onClick={() => setMobileOpen(false)}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </nav>

            {backlinks.length > 0 && (
              <section className="article-context-backlinks" aria-labelledby="article-backlinks-heading">
                <h2 id="article-backlinks-heading">linked from</h2>
                <ul>
                  {backlinks.map((backlink) => (
                    <li key={backlink.id}>
                      <Link href={`/articles/${backlink.slug}`} onClick={() => setMobileOpen(false)}>
                        {backlink.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
