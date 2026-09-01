"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Slide = { title: string; content: string };

function previewText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function titleClassName(title: string): string {
  if (title.length > 80) return "present-title present-title-long";
  if (title.length > 48) return "present-title present-title-medium";
  return "present-title";
}

export default function PresentModePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [articleTitle, setArticleTitle] = useState("");
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOverview, setShowOverview] = useState(false);
  const [animDir, setAnimDir] = useState<"in" | "out">("in");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(`/api/articles?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        const articles = Array.isArray(data) ? data : (data.articles || []);
        const article = articles.find((a: { slug: string }) => a.slug === slug);
        if (!article) {
          if (active) setLoading(false);
          return;
        }

        const detail = await fetch(`/api/articles/${article.id}/present`);
        if (detail.ok) {
          const { slides: nextSlides, title } = await detail.json();
          if (active) {
            setSlides(Array.isArray(nextSlides) ? nextSlides : []);
            setArticleTitle(title || article.title || "");
            setCurrent(0);
          }
        }
      } catch {
        // Keep the failure state quiet; the empty-slide state below gives the reader a way out.
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  const goTo = useCallback((i: number) => {
    const next = Math.max(0, Math.min(slides.length - 1, i));
    setAnimDir(next > current ? "in" : "out");
    setCurrent(next);
    setShowOverview(false);
  }, [current, slides.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goTo(current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goTo(current - 1);
      } else if (e.key === "Escape") {
        router.push(`/articles/${slug}`);
      } else if (e.key === "g" || e.key === "G") {
        setShowOverview((v) => !v);
      } else if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, goTo, router, slug]);

  if (loading) {
    return (
      <div className="present-shell present-shell-loading">
        <div className="present-loader" aria-label="Loading presentation">
          <span />
          <span />
          <span />
        </div>
        <PresentStyles />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="present-shell present-empty">
        <p>No slides could be generated from this article.</p>
        <Link href={`/articles/${slug}`} className="present-text-link">
          Back to article
        </Link>
        <PresentStyles />
      </div>
    );
  }

  const slide = slides[current];
  const progress = ((current + 1) / slides.length) * 100;
  const isFirst = current === 0;
  const isLast = current === slides.length - 1;

  if (showOverview) {
    return (
      <div className="present-overview-shell">
        <header className="present-overview-header">
          <div>
            <p>Presentation overview</p>
            <h1>{articleTitle}</h1>
            <span>{slides.length} slides</span>
          </div>
          <button
            type="button"
            onClick={() => setShowOverview(false)}
            className="present-button"
          >
            Back to presentation
          </button>
        </header>

        <main className="present-overview-grid" aria-label="Slide overview">
          {slides.map((overviewSlide, i) => (
            <button
              key={`${overviewSlide.title}-${i}`}
              type="button"
              onClick={() => goTo(i)}
              className={i === current ? "present-overview-card present-overview-card-active" : "present-overview-card"}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <strong>{overviewSlide.title}</strong>
              {overviewSlide.content && <em>{previewText(overviewSlide.content)}</em>}
            </button>
          ))}
        </main>
        <PresentStyles />
      </div>
    );
  }

  return (
    <div className="present-shell" data-slide={current + 1}>
      <div className="present-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <header className="present-topbar">
        <Link href={`/articles/${slug}`} className="present-exit-link" aria-label="Exit presentation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <span>Exit</span>
        </Link>

        <div className="present-counter" aria-label={`Slide ${current + 1} of ${slides.length}`}>
          {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </div>

        <button
          type="button"
          onClick={() => setShowOverview(true)}
          className="present-plain-button"
        >
          Overview (G)
        </button>
      </header>

      <main className="present-stage" aria-live="polite">
        <section
          key={`${current}-${animDir}`}
          className="present-slide"
          style={{ animation: "presentSlideIn 0.3s ease both" }}
        >
          <p className="present-eyebrow">
            {isFirst ? articleTitle : `${articleTitle} / slide ${current + 1}`}
          </p>
          <h1 className={titleClassName(slide.title)}>{slide.title}</h1>
          {slide.content && (
            <div
              className="presentation-content"
              dangerouslySetInnerHTML={{ __html: slide.content }}
            />
          )}
        </section>
      </main>

      <footer className="present-controls">
        <nav className="present-dots" aria-label="Slide navigation">
          {slides.slice(0, 30).map((dotSlide, i) => (
            <button
              key={`${dotSlide.title}-${i}`}
              type="button"
              onClick={() => goTo(i)}
              className={i === current ? "present-dot present-dot-active" : i < current ? "present-dot present-dot-read" : "present-dot"}
              title={dotSlide.title}
              aria-label={`Go to slide ${i + 1}: ${dotSlide.title}`}
              aria-current={i === current ? "step" : undefined}
            />
          ))}
          {slides.length > 30 && <span>+{slides.length - 30}</span>}
        </nav>

        <p className="present-hint">Arrow keys, Space, G overview, F fullscreen, Esc exit</p>

        <div className="present-arrows" aria-label="Presentation controls">
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={isFirst}
            className="present-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 19.5-7.5-7.5 7.5-7.5" />
            </svg>
            Prev
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={isLast}
            className="present-button"
          >
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </footer>

      <PresentStyles />
    </div>
  );
}

function PresentStyles() {
  return (
    <style>{`
      @keyframes presentSlideIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .present-shell,
      .present-overview-shell {
        /* Present mode is a deliberately permanently-dark deck (exception documented
           in CLAUDE.md); its palette lives here instead of the theme tokens. */
        --present-bg: #0d0d14;
        --present-bg-translucent: rgba(13, 13, 20, 0.96);
        --present-text-bright: #f8fafc;
        --present-text: #d1d5db;
        --present-text-muted: #9ca3af;
        --present-text-dim: #6b7280;
        --present-text-faint: #4b5563;
        --present-white: #fff;
        --present-accent: #60a5fa;
        --present-accent-soft: rgba(96, 165, 250, 0.72);
        --present-accent-light: #93c5fd;
        --present-accent-strong: #3b82f6;
        --present-dot: #374151;
        --present-card-bg: rgba(17, 24, 39, 0.7);
        --present-card-active-bg: rgba(30, 64, 175, 0.34);

        position: fixed;
        inset: 0;
        z-index: 80;
        min-width: 0;
        background: var(--present-bg);
        color: var(--present-text-bright);
        overscroll-behavior: contain;
      }

      .present-shell {
        display: grid;
        grid-template-rows: 2px auto minmax(0, 1fr) auto;
        height: 100dvh;
        overflow: hidden;
      }

      .present-progress {
        min-width: 0;
        background: rgba(148, 163, 184, 0.18);
      }

      .present-progress span {
        display: block;
        height: 100%;
        background: var(--present-accent);
        transition: width 0.35s ease;
      }

      .present-topbar,
      .present-controls {
        display: grid;
        min-width: 0;
        align-items: center;
        gap: 0.75rem;
        border-color: rgba(148, 163, 184, 0.18);
        background: var(--present-bg-translucent);
      }

      .present-topbar {
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        padding: 0.75rem 2rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      }

      .present-controls {
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        padding: 0.85rem 2rem 1rem;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
      }

      .present-stage {
        min-width: 0;
        min-height: 0;
        overflow: auto;
        scrollbar-gutter: stable;
      }

      .present-slide {
        display: flex;
        width: min(100%, 76rem);
        min-height: 100%;
        min-width: 0;
        flex-direction: column;
        justify-content: center;
        margin: 0 auto;
        padding: 2rem 4rem;
      }

      .present-eyebrow {
        margin-bottom: 0.85rem;
        color: var(--present-accent-soft);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.6875rem;
        font-weight: 700;
        line-height: 1.3;
        overflow-wrap: anywhere;
        text-transform: uppercase;
      }

      .present-title {
        max-width: 18ch;
        color: var(--present-white);
        font-family: Georgia, "Times New Roman", serif;
        font-size: 3.25rem;
        font-weight: 700;
        letter-spacing: 0;
        line-height: 1.02;
        overflow-wrap: anywhere;
      }

      .present-title-medium {
        max-width: 24ch;
        font-size: 2.65rem;
      }

      .present-title-long {
        max-width: 30ch;
        font-size: 2.15rem;
        line-height: 1.08;
      }

      .presentation-content {
        width: min(100%, 72ch);
        min-width: 0;
        margin-top: 1.65rem;
        color: var(--present-text);
        font-size: 1.08rem;
        line-height: 1.65;
        overflow-wrap: anywhere;
        user-select: text;
      }

      .presentation-content > * + * {
        margin-top: 0.8rem;
      }

      .presentation-content p:empty {
        display: none;
      }

      .presentation-content ul,
      .presentation-content ol {
        padding-left: 1.35rem;
      }

      .presentation-content ul {
        list-style: disc;
      }

      .presentation-content ol {
        list-style: decimal;
      }

      .presentation-content li + li {
        margin-top: 0.35rem;
      }

      .presentation-content strong {
        color: var(--present-white);
      }

      .presentation-content h3,
      .presentation-content h4 {
        color: var(--present-accent-light);
        font-weight: 700;
        margin-top: 1rem;
      }

      .presentation-content code {
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.08);
        padding: 0.1em 0.35em;
        font-size: 0.9em;
      }

      .presentation-content pre {
        max-width: 100%;
        overflow: auto;
      }

      .presentation-content table {
        width: 100%;
        max-width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
        table-layout: fixed;
      }

      .presentation-content th,
      .presentation-content td {
        border: 1px solid rgba(148, 163, 184, 0.26);
        padding: 0.4rem 0.55rem;
        vertical-align: top;
        overflow-wrap: anywhere;
      }

      .presentation-content th {
        background: rgba(255, 255, 255, 0.08);
        color: var(--present-text-bright);
      }

      .presentation-content img,
      .presentation-content video,
      .presentation-content iframe {
        max-width: 100%;
        max-height: 46vh;
        object-fit: contain;
      }

      .presentation-content a {
        color: var(--present-accent-light);
        text-decoration: underline;
      }

      .presentation-content blockquote {
        border-left: 3px solid var(--present-accent-strong);
        padding-left: 1rem;
        color: var(--present-text-muted);
        font-style: italic;
      }

      .present-exit-link,
      .present-plain-button,
      .present-text-link,
      .present-button {
        color: var(--present-text-muted);
        font-size: 0.75rem;
        line-height: 1;
        text-decoration: none;
        transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
      }

      .present-exit-link,
      .present-button {
        display: inline-flex;
        min-width: 0;
        align-items: center;
        gap: 0.45rem;
      }

      .present-exit-link:hover,
      .present-plain-button:hover,
      .present-text-link:hover,
      .present-button:hover {
        color: var(--present-white);
      }

      .present-exit-link svg,
      .present-button svg {
        width: 0.9rem;
        height: 0.9rem;
        flex: 0 0 auto;
      }

      .present-counter,
      .present-hint {
        color: var(--present-text-dim);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.6875rem;
        line-height: 1.25;
        text-align: center;
      }

      .present-plain-button {
        justify-self: end;
      }

      .present-dots {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.4rem;
        overflow-x: auto;
        padding: 0.25rem 0;
      }

      .present-dots span {
        flex: 0 0 auto;
        color: var(--present-text-faint);
        font-size: 0.625rem;
      }

      .present-dot {
        flex: 0 0 auto;
        width: 0.45rem;
        height: 0.45rem;
        border: 0;
        border-radius: 999px;
        background: var(--present-dot);
        transition: width 0.15s ease, background 0.15s ease;
      }

      .present-dot:hover {
        background: var(--present-text-dim);
      }

      .present-dot-read {
        background: var(--present-text-faint);
      }

      .present-dot-active {
        width: 1.35rem;
        background: var(--present-accent);
      }

      .present-arrows {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      .present-button {
        min-height: 2rem;
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 8px;
        background: transparent;
        padding: 0.5rem 0.75rem;
      }

      .present-button:hover {
        border-color: rgba(226, 232, 240, 0.58);
        background: rgba(255, 255, 255, 0.04);
      }

      .present-button:disabled {
        opacity: 0.32;
        pointer-events: none;
      }

      .present-overview-shell {
        height: 100dvh;
        overflow: auto;
        padding: 2rem;
      }

      .present-overview-header {
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        min-width: 0;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        width: min(100%, 72rem);
        margin: 0 auto 1.25rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        background: var(--present-bg-translucent);
        padding-bottom: 1rem;
      }

      .present-overview-header p,
      .present-overview-header span {
        color: var(--present-text-dim);
        font-size: 0.75rem;
        line-height: 1.3;
      }

      .present-overview-header h1 {
        margin-top: 0.2rem;
        color: var(--present-white);
        font-family: Georgia, "Times New Roman", serif;
        font-size: 1.75rem;
        font-weight: 400;
        line-height: 1.1;
        overflow-wrap: anywhere;
      }

      .present-overview-grid {
        display: grid;
        width: min(100%, 72rem);
        min-width: 0;
        grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
        gap: 0.75rem;
        margin: 0 auto;
      }

      .present-overview-card {
        min-width: 0;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 8px;
        background: var(--present-card-bg);
        padding: 0.9rem;
        text-align: left;
        transition: border-color 0.15s ease, background 0.15s ease;
      }

      .present-overview-card:hover,
      .present-overview-card-active {
        border-color: var(--present-accent);
        background: var(--present-card-active-bg);
      }

      .present-overview-card span {
        display: block;
        color: var(--present-text-dim);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.625rem;
        margin-bottom: 0.55rem;
      }

      .present-overview-card strong {
        display: block;
        color: var(--present-text-bright);
        font-size: 0.86rem;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }

      .present-overview-card em {
        display: block;
        margin-top: 0.45rem;
        color: var(--present-text-muted);
        font-size: 0.75rem;
        font-style: normal;
        line-height: 1.4;
      }

      .present-shell-loading,
      .present-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 2rem;
        text-align: center;
      }

      .present-empty p {
        color: var(--present-text);
        font-size: 1rem;
      }

      .present-loader {
        display: flex;
        gap: 0.4rem;
      }

      .present-loader span {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 999px;
        background: var(--present-accent);
        animation: presentPulse 0.8s infinite alternate;
      }

      .present-loader span:nth-child(2) {
        animation-delay: 0.15s;
      }

      .present-loader span:nth-child(3) {
        animation-delay: 0.3s;
      }

      @keyframes presentPulse {
        from { opacity: 0.35; transform: translateY(0); }
        to { opacity: 1; transform: translateY(-0.25rem); }
      }

      @media (max-width: 767px) {
        .present-topbar {
          grid-template-columns: minmax(0, 1fr) auto;
          padding: 0.65rem 1rem;
        }

        .present-counter {
          order: 3;
          grid-column: 1 / -1;
          text-align: left;
        }

        .present-slide {
          justify-content: flex-start;
          padding: 1.35rem 1rem 1.75rem;
        }

        .present-title {
          max-width: 100%;
          font-size: 2.1rem;
          line-height: 1.08;
        }

        .present-title-medium,
        .present-title-long {
          font-size: 1.72rem;
          line-height: 1.12;
        }

        .presentation-content {
          margin-top: 1.1rem;
          font-size: 0.98rem;
          line-height: 1.55;
        }

        .present-controls {
          grid-template-columns: 1fr;
          padding: 0.65rem 1rem max(0.75rem, env(safe-area-inset-bottom));
        }

        .present-hint {
          text-align: left;
        }

        .present-arrows {
          justify-content: stretch;
        }

        .present-arrows .present-button {
          flex: 1 1 0;
          justify-content: center;
        }

        .present-overview-shell {
          padding: 1rem;
        }

        .present-overview-header {
          position: static;
          flex-direction: column;
        }
      }

      @media (max-height: 720px) {
        .present-slide {
          justify-content: flex-start;
          padding-top: 1.25rem;
          padding-bottom: 1.25rem;
        }

        .present-title {
          font-size: 2.35rem;
        }

        .present-title-medium,
        .present-title-long {
          font-size: 1.9rem;
        }

        .presentation-content {
          font-size: 0.98rem;
          line-height: 1.5;
        }
      }
    `}</style>
  );
}
