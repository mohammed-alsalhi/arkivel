# arkivel

Arkivel is a small, self-hosted knowledge base for writing, linking, searching, and exporting documentation. It uses Next.js, PostgreSQL, Prisma, Tiptap, and optional Vercel Blob uploads.

Choose a site mode for your instance:

| interface | mode | purpose |
| --- | --- | --- |
| wiki | `ARKIVEL_SITE_MODE=wiki` | a knowledge base |
| media | `ARKIVEL_SITE_MODE=media` | a personal film and series library on the same backend |

Each deployment keeps its own domains, environment variables, database, and blob credentials.

The media mode is the worked example of Arkivel serving a domain that is not a wiki. Set `NEXT_PUBLIC_ARKIVEL_NAME="My library"`, `ARKIVEL_SITE_MODE=media`, and `ARKIVEL_MODULES=collections,media,assets,export,import`, then apply the `watchlist` kit from `/admin/kits`. Optional keys: `TMDB_API_KEY` for the full catalogue, `OMDB_API_KEY` for IMDb and Rotten Tomatoes ratings, `ANTHROPIC_API_KEY` for Claude-assisted mood picks. Without keys the library searches a bundled starter catalogue and matches moods locally.

Vercel builds use its native Next.js adapter. Self-hosted builds produce a standalone server; containers run the pinned Prisma migrations before starting it.

Wiki deployments default to the lowercase, full-viewport `folio` skin. Set `NEXT_PUBLIC_ARKIVEL_SKIN=wiki` to make the classic framed wiki skin the site default; signed-in readers can override either default from the appearance section in settings. Press `⌘K` / `Ctrl+K` anywhere for the command palette.

## api

Every route under `/api` is the interface's own surface and accepts a personal access token: create one under `/settings/tokens`, then send `Authorization: Bearer ark_…` to act as that user with their role. The generated reference at `/api-docs` lists the frozen public v1 read endpoints and the full route inventory. Set `ARKIVEL_API_CORS_ORIGINS` to let browser apps on other origins call the api with a token.

## core

- articles with rich text, wiki links, backlinks, and a local graph
- categories, tags, keyword search, and recent changes
- revision history, diff, blame, restore, redirects, and draft share links
- Markdown, JSON, ZIP, Notion, and Obsidian import/export paths
- asset uploads through Vercel Blob
- local credentials, optional OAuth, sessions, roles, and audit logs
- maintenance/read-only controls and health endpoints
- a versioned `/api/v1` contract with generated OpenAPI

## local setup

Requirements: Node.js 24 LTS, PostgreSQL, and npm.

```bash
git clone https://github.com/mohammed-alsalhi/arkivel.git
cd arkivel
npm install
cp .env.example .env
npm run db:deploy
npm run dev
```

`npm run db:deploy` applies the migrations under `prisma/migrations` (a fresh database gets the full schema; an existing one gets only what is pending). Never `prisma db push` against an existing database — change `prisma/schema.prisma`, generate a migration with `npm run db:migrate` against a branch database, review the SQL, and ship it with the code.

Pick which modules a deployment runs with `ARKIVEL_MODULES` (for example `graph,collections,api`) or from `/admin/modules`; see `docs/modules-and-collections.md`.

To populate a fresh local database with a realistic demo dataset (categories, tags, cross-linked articles, and semantic relations), run `npm run seed:demo`. The seed is idempotent — it upserts by slug and name, so re-running it is safe.

The application opens at `http://localhost:3000`. The marketing website is deployed separately; this repository contains the self-hostable application and its documentation.

## required configuration

```dotenv
DATABASE_URL=postgresql://user:password@host:5432/database
ADMIN_SECRET=replace-me
NEXT_PUBLIC_BASE_URL=https://wiki.example.com
ARKIVEL_SITE_MODE=wiki
```

Optional variables include OAuth credentials, `BLOB_READ_WRITE_TOKEN`, and public brand assets. See [.env.example](.env.example).

Set `ARKIVEL_SITE_MODE` and every `NEXT_PUBLIC_*` value before building. Public URLs, branding, the default skin, and generated metadata must use the same values at build time and runtime. Rebuild after changing them. Database credentials, `ADMIN_SECRET`, module selection, upload credentials, and OAuth secrets remain runtime settings. GitHub OAuth uses `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`; outside Compose, set `NEXTAUTH_URL` to the public origin when enabling OAuth.

## docker compose

Copy `.env.example` to `.env` and edit the deployment settings, then run:

```bash
docker compose up --build -d
```

Compose passes the public settings to both the image build and the running app, starts its bundled PostgreSQL service, and applies pending wiki migrations before serving on port 3000. It uses the bundled database URL instead of `.env`'s `DATABASE_URL`; that value is for running the app directly against your own database. OAuth's `NEXTAUTH_URL` defaults to `NEXT_PUBLIC_BASE_URL` in Compose. Set a separate Compose project name with `docker compose -p <instance> ...` for each instance so their database volumes stay separate.

After changing public settings, rerun `docker compose up --build -d`; restarting an old image does not update its compiled settings. For direct `docker build`, provide the same public values with `--build-arg`; the image retains them as runtime defaults. `docker compose down` stops the services while retaining the database volume.

## commands

```bash
npm run lint
npm test
npm run test:e2e
npm run build
npm run release:docs-sync
npm run seed:demo
```

## documentation

- [user guide](docs/help.md)
- [feature boundary](docs/features.md)
- [api v1 contract](docs/api-v1-migration.md)
- [maintainer guide](docs/maintainer-guide.md)
- [architecture](ARCHITECTURE.md)

License: MIT.
