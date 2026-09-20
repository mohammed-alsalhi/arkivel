# architecture

Arkivel is one Next.js application with two runtime surfaces selected by `ARKIVEL_SITE_MODE`.

## product mode

Product mode serves the public Arkivel website, documentation, and API reference. `src/proxy.ts` blocks wiki routes, so this deployment does not require the wiki database or its secrets.

## wiki mode

Wiki mode renders the three-pane knowledge interface and the retained API routes. Server components and route handlers access PostgreSQL through the singleton in `src/lib/prisma.ts`. Vercel Blob is the only supported upload backend.

`NEXT_PUBLIC_ARKIVEL_SKIN` selects the default wiki presentation without changing routes or data. `folio` is the full-viewport default; `wiki` preserves the classic framed skin on the same shared page components. The root layout resolves the effective skin per request as `arkivel-skin` cookie → the signed-in user's saved `skin` preference → the env default, and stamps it as `data-skin` on `<html>`; `src/styles/folio.css` holds every folio-only override so the wiki skin's rules stay untouched. Page chrome is a `Page` concern: it takes a `trail` (`src/lib/trail.ts`) and renders the sticky `PageTopbar` and `PageFooter`; `src/lib/trail-server.ts` walks category ancestors, and `src/app/articles/[slug]/layout.tsx` shares an article's title and category path with every article-workflow route through `ArticleTrailContext`.

The core data graph is deliberately small:

- users, OAuth accounts, sessions, API keys, and preferences
- articles, revisions, aliases, redirects, categories, tags, and article links
- assets, export history, audit logs, and runtime settings

Legacy physical tables may remain in an upgraded database even when they are absent from the application Prisma schema. That preserves data while the focused application runs. Physical deletion is a separate operation requiring a fresh backup, disposable restore rehearsal, explicit dependency-ordered SQL without `CASCADE`, and retained-table count verification.

## request flow

1. `src/proxy.ts` selects the allowed surface and adds browser security headers.
2. `src/app/layout.tsx` selects `ProductShell` or the wiki `LayoutShell`.
3. routes use shared auth, audit, import/export, and wiki-link helpers.
4. Prisma talks to PostgreSQL; uploads go to Vercel Blob.

The build runs `prisma generate` and `next build`. It never migrates production.
