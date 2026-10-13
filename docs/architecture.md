# architecture

Arkivel is one Next.js application with a wiki, a docs, and a media interface, selected by `ARKIVEL_SITE_MODE`. An instance has one PostgreSQL database, its own accounts, and its own configuration.

## application

Server components and route handlers reach PostgreSQL through Prisma (`src/lib/prisma.ts`). The core tables are articles, revisions, links, categories, tags, users, sessions, audit logs, assets, and settings. Collections add typed records and views on three generic tables; modules and starter kits compose workflows on top. See [modules and collections](modules-and-collections.md).

Uploads go to local disk (`ARKIVEL_STORAGE=local`) or an S3-compatible bucket (`ARKIVEL_STORAGE=s3`) and are served through `/api/files/...` with the instance's access checks.

## presentation

The request resolves the skin from the reader cookie, then the saved user preference, then `NEXT_PUBLIC_ARKIVEL_SKIN`. The four skins share components, editors, permission checks, and collection behavior and differ only in presentation. Media mode has its own shell.

Branding comes from build-time `NEXT_PUBLIC_*` values; their defaults live in `src/lib/config.ts`.

## identity

Local passwords and optional GitHub or Google OAuth both create an Arkivel database session. Personal access tokens resolve to the same user and role. Roles are viewer, editor, and admin. See [authentication](authentication.md).

## build and deploy

Builds generate the Prisma client and compile Next.js to a standalone server. They never migrate a database. The container runs `prisma migrate deploy` on start; other hosts run `npm run db:deploy` before serving traffic. See [deploy/](../deploy/README.md).

`npm run api:reference` exports the API contract, OpenAPI document, and route inventory as JSON with the version and commit, for documentation sites that live outside this repository.
