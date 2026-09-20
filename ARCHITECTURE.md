# architecture

Arkivel is a self-hostable Next.js application with wiki and media interfaces selected by `ARKIVEL_SITE_MODE`. Each instance has one PostgreSQL database, its own accounts, and its own configuration. The marketing website and managed-hosting operations are deployed separately.

## application

Server components and route handlers access PostgreSQL through `src/lib/prisma.ts`. Core data includes articles, revisions, links, categories, tags, users, sessions, audit logs, assets, and settings. Collections provide typed records and views; modules and starter kits compose additional workflows. Media mode presents the watchlist collections through a dedicated shell.

The current upload implementation uses Vercel Blob. A portable storage implementation is planned; database hosting and authentication provider selection remain separate concerns.

## presentation

`NEXT_PUBLIC_ARKIVEL_SKIN` selects the default wiki skin. The request resolves skin from the reader cookie, then the saved user preference, then the environment default. The shared components render both folio and wiki. Skins own presentation; editors, permission checks, and collection behavior stay shared. Media mode owns its shell.

Branding currently uses build-time `NEXT_PUBLIC_*` settings. Runtime branding and a broader skin registry are planned, not yet implemented.

## identity and permissions

The application owns its user IDs, content ownership, and viewer/editor/admin permissions. Local credentials create database sessions; API tokens resolve to the same user. Existing OAuth callbacks use a separate NextAuth session and still need unification with application session lookup. Clerk and Supabase Auth integrations are planned. A hosted service must not bypass instance permission checks.

## deployment boundary

The public repository owns migrations, generic Docker/Node setup, the API contract, and self-hosting documentation. A hosting service owns customer billing, domain verification, provisioning, deployment credentials, backups, and release rollout. It deploys a pinned application version rather than duplicating application logic.

Start managed hosting with an isolated application and database per customer. There is no shared-database tenant isolation in the current schema. Custom domains must be verified and routed only to their registered instance, with instance-specific authentication callbacks.

`npm run api:reference` produces a static reference from the API contract with version and commit provenance. External websites consume that artifact; the application never imports their code.

Builds generate Prisma and compile Next.js. They do not migrate production. Containers apply pending migrations before starting; other hosts must run `npm run db:deploy` explicitly. Removing product mode requires moving the marketing deployment before merging this change; the old mode now fails configuration validation rather than falling through to wiki mode.
