# Arkivel contributor instructions

Arkivel has one public source repository and two Vercel deployments:

- `arkivel.com` uses `ARKIVEL_SITE_MODE=product` for the product site and docs.
- the WorldWiki project uses `ARKIVEL_SITE_MODE=wiki` for the private wiki.

The core is fixed: articles, wiki links, search, spaces (categories), tags, revisions, users, sessions, audit, admin, and settings. Everything else is either a **module** (graph, assets, import, export, api, feeds, share, collections — enabled per deployment via `ARKIVEL_MODULES` and `/admin/modules`) or a **collection template** on the generic collections engine. Read `docs/modules-and-collections.md` before adding anything: no new table without first asking whether a collection template covers the need; a module never imports another module; there are no third-party plugins or a marketplace. AI assistants, live collaboration, gamification, and social feeds remain outside the product.

Product decisions on record: the two built-in skins (`folio`, `wiki`) with a per-user choice in settings and the `⌘K` command palette are part of the core retrieval path (6.1.0). A theme editor, custom color presets, or a theme marketplace are not — keep appearance to the two skins plus light/dark. Per-deployment modules, the collections engine, and starter kits are the configurability model (6.3.0).

## Safety

- Never run `prisma db push`, `--accept-data-loss`, `DROP ... CASCADE`, or a destructive migration against an existing database.
- Schema changes are migrations: edit `prisma/schema.prisma`, generate with `npm run db:migrate` against a branch database, review the SQL under `prisma/migrations/`, and ship it with the code; `npm run db:deploy` applies pending migrations (the Docker image runs it on start).
- Back up and restore-rehearse before any physical schema deletion.
- Builds generate the Prisma client but do not migrate production.
- Keep product and wiki secrets isolated in their own Vercel projects.

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
