# railway

Railway builds the Docker image from the repository and runs it next to a
Railway PostgreSQL service.

1. New project from this GitHub repository.
2. In the service settings, set the config-as-code path to
   `deploy/railway/railway.json` (Railway looks at the root by default).
3. Add a PostgreSQL service and reference it from the app:
   `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
4. Attach a volume to the app at `/app/data/uploads` and set
   `ARKIVEL_UPLOAD_DIR=/app/data/uploads`.
5. Set `NEXTAUTH_SECRET`, `ARKIVEL_REGISTRATION=closed`, and the public
   build values (`ARKIVEL_SITE_MODE`, `NEXT_PUBLIC_BASE_URL` with the Railway
   domain). Railway passes service variables to the Docker build as build args,
   so the public values compile in.
6. Deploy, then create the owner from the service shell:
   `node scripts/bootstrap-owner.mjs --username owner --email owner@example.com`.

Volumes pin the service to one replica. For more replicas use
`ARKIVEL_STORAGE=s3`. This config follows the Railway docs and has not been
deployed from this repository yet.
