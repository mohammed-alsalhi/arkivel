# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js 16 + Turbopack)
npm run build        # prisma db push && next build
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema changes to database
node prisma/seed.mjs # Seed default categories
```

After changing `prisma/schema.prisma`, always run `npx prisma generate` and delete `.next/` to avoid stale client errors.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Prisma 7 + PostgreSQL (Neon) + Tailwind CSS 4 + Tiptap editor

**Two remotes:** `origin` (private personal wiki) and `public` (public product repo). The public repo has clean history without personal data.

### Key Patterns

**Configuration:** All branding is driven by `NEXT_PUBLIC_*` env vars read through `src/lib/config.ts`. Defaults produce a generic wiki; personal branding is set via Vercel env vars.

**Auth:** Dual auth system. Legacy: single admin password via `ADMIN_SECRET` env var with cookie-based `admin_token`. Multi-user: bcrypt-hashed passwords in `User` table with session tokens. `getSession()` returns current user, `isAdmin()` checks both paths, `requireRole(user, role)` for granular permissions. Roles: admin, editor, viewer.

**Prisma:** Uses `@prisma/adapter-pg` with raw `pg` pool (required for Neon). Singleton in `src/lib/prisma.ts` with `globalThis` caching for dev hot-reload.

**Wiki Links:** Articles cross-reference via `[[Article Name]]` syntax. Custom Tiptap extension (`src/components/editor/WikiLinkExtension.ts`) renders them as `data-wiki-link` anchors. At display time, `resolveWikiLinks()` in `src/lib/wikilinks.ts` checks the DB and marks broken links with CSS class. `getBacklinks()` finds reverse references.

**Revisions:** Every article PUT auto-snapshots the current state into `ArticleRevision` before applying changes. History page shows timeline; diff page compares two revisions.

**Content Storage:** Articles store `content` (HTML from Tiptap) and `contentRaw` (optional Markdown). The HTML is what gets displayed; Markdown is for export.

**Theming:** CSS variables now live in `src/styles/tokens.css` (the first module imported by `src/app/globals.css`) under the `@theme` block, alongside the `html[data-theme="dark"]` / style-preset / color-theme overrides. `src/app/globals.css` itself is just the leading `@import "tailwindcss"` / highlight.js imports, the z-index/breakpoint conventions comment (which stays at the top of globals.css), and one `@import "../styles/<module>.css"` per feature module (`tokens`, `primitives`, `shell`, `links-content`, `article`, `editor`, `home`, `trails`, `atlas`, `intelligence`, `studio`, `misc`, `overlays`, `modes`, `mobile-floor`) — Tailwind 4 inlines these imports before processing, so `@theme` works from the imported file. Module import order is the cascade order; never reorder. Dark mode via `html[data-theme="dark"]` overrides. Important: use `@theme` not `@theme inline` — the latter inlines hex values into Tailwind utilities, breaking CSS variable overrides. The persisted theme and sidebar prefs are applied to `<html>` by an inline bootstrap script in `src/app/layout.tsx` *before first paint* — never re-derive them in `useState` initializers (hydration mismatch); read the `data-*` attribute off `document.documentElement` in a `useEffect` instead. Charts use `--color-chart-1..6` (light + dark values); never hardcode hex colors in components or inline styles — use theme variables so dark mode works. One sanctioned exception: present mode (`src/app/present/[slug]/page.tsx`) is a deliberately permanently-dark deck that does not follow the theme; its palette is defined once as local `--present-*` custom properties at the top of its styled-jsx block — reuse those variables there, don't add new raw colors.

**Map:** Disabled by default (`NEXT_PUBLIC_MAP_ENABLED`). Uses Leaflet with `CRS.Simple` (pixel coords, not geographic). Dynamically imported (no SSR). Markers stored in `MapMarker` table and optionally linked to articles. Leaflet overlay controls use `z-[1000]` (they must beat Leaflet's internal panes) — this is the one sanctioned exception to the z-index scale.

### UI Conventions (the design language)

Every list/settings/info/admin page MUST use the shared primitives from `src/components/ui/index.tsx` as its scaffold — do not hand-roll headers, buttons, tables or empty states:

- `<Page>` as the page root (`width="narrow"` for simple forms, `"wide"`/`"full"` for dashboards)
- `<PageHeader title description actions kicker>` for the title row — never a raw `<h1>`
- `<Section title>` for sub-headings; `<StatGrid>`/`<StatCard>` for stat tiles
- `<DataTable>` for plain tables (it includes its own `overflow-x-auto` wrapper — never double-wrap); any other `<table>` must sit inside an `overflow-x-auto` container
- `<EmptyState title description actions>` for "nothing here" placeholders
- `<Button>`/`<LinkButton>`/`ui-button` classes for generic actions; `<IconButton>` for icon-only

Exceptions that keep bespoke designs: home portal (`/`), article reading shell (`articles/[slug]`), the Tiptap editor, and the graph/map/atlas/trails/studio/intelligence/canvas/split/present workspaces, the `/ask` chat workspace, and category concept maps (`categories/[slug]/concept-map`), plus chromeless `embed/`/`share/` token views.

**Breakpoints:** Tailwind boundaries only — sm 640 / md 768 / lg 1024 / xl 1280 (max-width queries use boundary − 1). Do not invent new breakpoints.

**Z-index tiers** (documented at the top of `globals.css`): 1–30 in-page floating, 40 app chrome (drawer, bottom nav), 50 dropdowns/popovers, 60 full-width overlays, 70 modals, 80 toasts, 100 skip-link. Pick from the scale; never use arbitrary values like `z-[9999]`.

**Mobile/touch rules:** native inputs stay ≥16px on phones (iOS zoom); interactive targets get ≥36–40px on coarse pointers via the `@media (pointer: coarse)` block in `globals.css` and Tailwind `pointer-coarse:` variants; body text is 16px on phones, 14px on desktop. Drag interactions must handle touch events, not just mouse.

**Overlays:** anything that covers the page uses `useScrollLock` (`src/lib/useScrollLock.ts`), `role="dialog" aria-modal="true"` with a label, Escape-to-close, and a backdrop; trap focus with `useFocusTrap` (`src/lib/useFocusTrap.ts`) where the overlay is the only interactive surface.

**Navigation:** the sidebar stays minimal (~20 links). New destinations go in `/tools` (`src/app/tools/page.tsx`), the admin directory on `/admin` (`ADMIN_DIRECTORY`), and the command palette (`COMMAND_DESTINATIONS` in `src/lib/navigation.ts`) — all three must be updated when adding a route.

### Data Flow for Articles

1. Create/edit via Tiptap editor → HTML + optional Markdown
2. POST/PUT to `/api/articles/[id]` → Prisma creates/updates + auto-revision
3. Display: server component fetches article → `resolveWikiLinks(content)` → render HTML
4. Backlinks computed via `getBacklinks(slug)` querying other articles' content

### Search

`/api/search` and `/app/search/page.tsx` both implement relevance-ranked search. Multi-word queries use AND logic (every word must appear in title/content/excerpt). Results sorted by: exact title match (100) > starts with (80) > title contains (60) > content only (0).

**Footnotes:** Custom Tiptap `FootnoteRef` node extension. Stored as `<sup data-footnote="text">` in HTML. Auto-numbered via CSS counters. Footnote section appended at display time by `appendFootnoteSection()`.

**Syntax Highlighting:** Code blocks use `@tiptap/extension-code-block-lowlight` with lowlight (highlight.js). Language selection on insert, theme-aware CSS.

**Article Status:** Articles have `status` field ("draft", "review", "published"). Non-published articles hidden from non-admins. `isPinned` boolean for featuring at top of category pages.

**Semantic Links:** `ArticleLink` model with relation types (related-to, is-part-of, etc.). Defined in `src/lib/relations.ts`. Rendered directly by the article page (`src/app/articles/[slug]/page.tsx`).

**Graph:** D3 force-directed graph at `/graph`. API at `/api/graph` returns nodes/edges from wiki links and ArticleLink table. Supports BFS subgraph via `?center=slug&depth=N`.

**Feeds & API:** RSS at `/feed.xml`, Atom at `/feed/atom`. Public REST API at `/api/v1/` with API key auth (`X-API-Key` header). Webhooks dispatched on article events.

**Plugins:** Lightweight plugin system. Interface in `src/lib/plugins/types.ts`, registry in `src/lib/plugins/registry.ts`. Plugin state in `PluginState` table.

## Database Models

- **Article** — main content with slug, HTML content, category, tags, revisions, status, sortOrder, isPinned
- **Category** — hierarchical (self-referential `parentId`), ordered by `sortOrder`
- **Tag** — hierarchical (self-referential `parentId`), many-to-many with articles via `ArticleTag`
- **ArticleRevision** — immutable snapshots created on every edit, with userId attribution
- **ArticleTranslation** — multi-language article content (locale, title, content)
- **User** — multi-user accounts (username, email, passwordHash, role)
- **Session** — auth sessions with token and expiry
- **Watchlist** — user-article watch pairs for notifications
- **Notification** — edit/reply/mention notifications per user
- **ApiKey** — public API authentication keys per user
- **Webhook** / **WebhookDelivery** — event webhooks with delivery logging
- **ArticleLink** — semantic wiki links with relation types
- **MapMarker** — coordinates + optional article link, grouped by `mapId`, with zoom levels
- **MapConfig** / **MapLayer** / **MapDetailLevel** — multi-map system with layers
- **PluginState** — plugin enable/disable config
- **MetricLog** — performance metric logging
- **CollaborationSession** — real-time collab Yjs document storage
- **Discussion** — article discussion comments with optional userId
