# Arkivel contributor instructions

Arkivel is an open-source knowledge base with three interfaces, chosen by `ARKIVEL_SITE_MODE`:

- `product`: the product site and docs.
- `wiki`: the knowledge base.
- `media`: a personal film and series library (the worked example of Arkivel serving a non-wiki domain), on the same backend, database, accounts, and admin. It runs the `watchlist` kit and the `media` module; `src/media/` composes them into the library the shell reads.

The core is fixed: articles, wiki links, search, spaces (categories), tags, revisions, users, sessions, audit, admin, and settings. Everything else is either a **module** (graph, assets, import, export, api, feeds, share, collections, media — enabled per deployment via `ARKIVEL_MODULES` and `/admin/modules`) or a **collection template** on the generic collections engine. Read `docs/modules-and-collections.md` before adding anything: no new table without first asking whether a collection template covers the need; a module never imports another module (route handlers, kits, and `src/media/` are where modules compose); there are no third-party plugins or a marketplace. Live collaboration, gamification, and social feeds remain outside the product. AI stays optional and behind a key: the only use is the media library's mood pick, which falls back to local matching.

Product decisions on record: the two built-in skins (`folio`, `wiki`) with a per-user choice in settings and the `⌘K` command palette are part of the core retrieval path. A theme editor, custom color presets, or a theme marketplace are not — the wiki shell stays at two skins plus light/dark. Per-deployment modules, the collections engine, and starter kits are the configurability model. A **site mode** is a shell (pages and presentation) over the shared backend; each shell owns its look, so the media shell's dark coral theme is part of that mode, not a third wiki skin.

## Safety

- Never run `prisma db push`, `--accept-data-loss`, `DROP ... CASCADE`, or a destructive migration against an existing database.
- Schema changes are migrations: edit `prisma/schema.prisma`, generate with `npm run db:migrate` against a branch database, review the SQL under `prisma/migrations/`, and ship it with the code; `npm run db:deploy` applies pending migrations (the Docker image runs it on start).
- Back up and restore-rehearse before any physical schema deletion.
- Builds generate the Prisma client but do not migrate production.
- Keep independently operated instances and their secrets isolated.

## Development

```bash
npm install
npx prisma generate
npm run dev
```

Before delivery, run:

```bash
npm run lint
npm test
npm run build
npm run release:docs-sync
```

Prefer deletion and existing primitives over new abstractions. Update the relevant docs with behavior, API, schema, or deployment changes. Keep commits concise, detailed, and lowercase.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
