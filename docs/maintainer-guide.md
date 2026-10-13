# maintainer guide

## deploy

Pick a site mode, give the instance its own domain, database, and environment, and follow [deploy/](../deploy/README.md).

## migrations

The schema is managed by Prisma Migrate. `prisma/migrations/0_baseline` creates the initial schema and later migrations extend it; a fresh database gets the whole chain.

- change `prisma/schema.prisma`, then run `npm run db:migrate` against a branch database to generate and apply the migration
- review the generated SQL and commit it with the code
- `npm run db:status` shows what a database is missing; `npm run db:deploy` applies pending migrations (the container does this on start)
- never run `prisma db push`, `--accept-data-loss`, or `DROP ... CASCADE` against an existing database
- a migration that drops tables or columns needs a verified backup and a restore rehearsal first

## data safety

Before schema or infrastructure work:

1. stop the application so no writes land during the snapshot
2. take a custom-format PostgreSQL dump (`npm run backup` does this together with uploads and checksums)
3. restore it into an isolated database and rehearse the exact change there
4. cut over only after row counts and relationships match

## checks

```bash
npx prisma validate
npm run lint
npm test
npm run build
npm run release:docs-sync
```

CI runs the same checks, the Playwright suite against every skin, and a backup restore rehearsal.
