# maintainer guide

## deploy

Choose a site mode and configure your instance with its own domain and environment variables. The marketing website is a separate static application. Deployment files for Docker, a VPS, Fly, Railway, Render, and Vercel are under [deploy/](../deploy/README.md).

## data safety

Before schema or infrastructure work:

1. stop the application or take it off the network so no writes land during the snapshot
2. take a fresh custom-format PostgreSQL dump
3. checksum it and inspect `pg_restore --list`
4. restore it into an isolated database
5. rehearse the exact SQL and smoke the retained core
6. cut over only after retained row counts and relationships match

Never use `--accept-data-loss` or `DROP ... CASCADE`. Review schema changes against the data your instance stores.

## migrations

The schema is managed by Prisma Migrate. `prisma/migrations/0_baseline` creates the initial application schema; subsequent migrations extend it. Apply the full migration chain to a fresh database.

- change `prisma/schema.prisma`, then `npm run db:migrate` against a branch database to generate and apply the migration locally
- review the generated SQL, commit it with the code
- `npm run db:status` shows what a database is missing; `npm run db:deploy` applies pending migrations (the Docker image runs it on start; other hosts run it explicitly)
- a migration that drops tables or columns needs a verified backup and a restore rehearsal first

## checks

```bash
npx prisma validate
npx prisma generate
npm run lint
npm test
npm run build
npm run release:docs-sync
```

Builds do not run database migrations. Verify each deployment runs its intended Git SHA.
