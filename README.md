# arkivel

Arkivel is a small, self-hosted knowledge base for writing, linking, searching, and exporting documentation. It uses Next.js, PostgreSQL, Prisma, and Tiptap.

Choose a site mode for your instance:

| interface | mode | purpose |
| --- | --- | --- |
| wiki | `ARKIVEL_SITE_MODE=wiki` | a knowledge base |
| docs | `ARKIVEL_SITE_MODE=docs` | versioned documentation using articles and collections |
| media | `ARKIVEL_SITE_MODE=media` | a personal film and series library on the same backend |

Each deployment keeps its own domains, environment variables, database, and storage.

The media mode is the worked example of Arkivel serving a domain that is not a wiki. Set `NEXT_PUBLIC_ARKIVEL_NAME="My library"`, `ARKIVEL_SITE_MODE=media`, and `ARKIVEL_MODULES=collections,media,assets,export,import`, then apply the `watchlist` kit from `/admin/kits`. Optional keys: `TMDB_API_KEY` for the full catalogue, `OMDB_API_KEY` for IMDb and Rotten Tomatoes ratings, `ANTHROPIC_API_KEY` for Claude-assisted mood picks. Without keys the library searches a bundled starter catalogue and matches moods locally.

Builds produce a standalone server; containers run the pinned Prisma migrations before starting it.

All skins fill the browser viewport. Wiki deployments default to the lowercase `folio` skin. Set `NEXT_PUBLIC_ARKIVEL_SKIN=wiki` to make the classic wiki skin the site default; `editorial` adds warm paper tones and serif reading typography; `compact` adds a denser workspace with a narrow sidebar. Readers can override the default from the appearance section in settings. Press `⌘K` / `Ctrl+K` anywhere for the command palette.

## api

Every route under `/api` is the interface's own surface and accepts a personal access token: create one under `/settings/tokens`, then send `Authorization: Bearer ark_…` to act as that user with their role. The generated reference at `/api-docs` lists the frozen public v1 read endpoints and the full route inventory. Set `ARKIVEL_API_CORS_ORIGINS` to let browser apps on other origins call the api with a token.

## core

- articles with rich text, wiki links, backlinks, and a local graph
- categories, tags, keyword search, and recent changes
- revision history, diff, blame, restore, redirects, and draft share links
- Markdown, JSON, ZIP, Notion, and Obsidian import/export paths
- asset uploads to local disk or a private S3-compatible bucket
- local credentials, optional OAuth, sessions, roles, and audit logs
- health endpoints
- a versioned `/api/v1` contract with generated OpenAPI

## local setup

Requirements: Node.js 24 LTS, PostgreSQL, and npm.

```bash
git clone https://github.com/mohammed-alsalhi/arkivel.git
cd arkivel
npm install
cp .env.example .env
npm run db:deploy
# create an owner using the command in docs/authentication.md
npm run dev
```

`npm run db:deploy` applies the migrations under `prisma/migrations` (a fresh database gets the full schema; an existing one gets only what is pending). Never `prisma db push` against an existing database — change `prisma/schema.prisma`, generate a migration with `npm run db:migrate` against a branch database, review the SQL, and ship it with the code.

Pick which modules a deployment runs with `ARKIVEL_MODULES` (for example `graph,collections,api`) or from `/admin/modules`; see `docs/modules-and-collections.md`.

To populate a fresh local database with a realistic demo dataset (categories, tags, cross-linked articles, and semantic relations), run `npm run seed:demo`. The seed is idempotent — it upserts by slug and name, so re-running it is safe.

The application opens at `http://localhost:3000`. The marketing website is deployed separately; this repository contains the self-hostable application and its documentation.

Create the first administrator using [owner setup](docs/authentication.md). Registration is closed by default; opening it only creates viewers after an owner exists.

## required configuration

```dotenv
DATABASE_URL=postgresql://user:password@host:5432/database
NEXT_PUBLIC_BASE_URL=https://wiki.example.com
ARKIVEL_SITE_MODE=wiki
ARKIVEL_REGISTRATION=closed
```

Optional variables include OAuth credentials, S3 storage, and public brand assets. See [.env.example](.env.example).

Set `ARKIVEL_SITE_MODE` and every `NEXT_PUBLIC_*` value before building. Public URLs, branding, the default skin, and generated metadata must use the same values at build time and runtime. Rebuild after changing them. Database credentials, module selection, storage settings, and OAuth secrets remain runtime settings. GitHub OAuth uses `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`; outside Compose, set `NEXTAUTH_URL` to the public origin when enabling OAuth.

## deploy

Copy `.env.example` to `.env`, edit the deployment settings, then run from the repository root:

```bash
docker compose -f deploy/docker/compose.yml --env-file .env up -d --build
```

Compose builds the image with the public settings, starts PostgreSQL, applies pending migrations, and serves on port 3000. It uses its own database URL instead of `.env`'s `DATABASE_URL`; that value is for running the app directly against your own database. Rerun with `--build` after changing public settings.

Everything deployment-related lives in [deploy/](deploy/README.md): the Dockerfile and Compose stack, a VPS overlay with automatic HTTPS, and configs for Fly, Railway, Render, and notes for Vercel. All of them run the same image.

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

- [deploying](deploy/README.md)
- [owner setup and authentication](docs/authentication.md)
- [user guide](docs/help.md)
- [feature boundary](docs/features.md)
- [api v1 contract](docs/api-v1-migration.md)
- [maintainer guide](docs/maintainer-guide.md)
- [architecture](ARCHITECTURE.md)

License: MIT.

See [documentation mode](docs/documentation-mode.md) for version navigation and authoring.

For sign-in-only instances, local/S3 uploads, member setup, and verified backups, see [private self-hosting](docs/private-self-hosting.md).
