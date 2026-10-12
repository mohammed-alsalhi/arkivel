# vercel

Vercel builds the Next.js app directly from the repository; the Dockerfile is
not used. Two things the app needs are missing there, so you provide them:

- PostgreSQL: Neon, Supabase, or any reachable instance. Set `DATABASE_URL`.
- storage: there is no persistent disk, so set `ARKIVEL_STORAGE=s3` with an
  S3-compatible bucket (Cloudflare R2, Backblaze B2, AWS S3). Local uploads do
  not survive a serverless invocation.

Import the repository in Vercel, set the public build values and the runtime
values from `.env.example` as project environment variables, and deploy.
Migrations do not run automatically; run `npx prisma migrate deploy` against
`DATABASE_URL` from your machine after each schema change. Create the owner the
same way, locally against the production database:
`npm run setup:owner`.

Long-running work (backups, large imports) is better done from a machine with
the repository checked out than from Vercel. If you want data to stay in one
place you control, prefer [docker](../docker/) or [vps](../vps/).
