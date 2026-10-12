# render

Render builds the Docker image and runs it as a web service with a persistent
disk, next to a managed PostgreSQL database. Both are declared in
`render.yaml`.

Render only discovers Blueprints at the repository root. Either copy
`deploy/render/render.yaml` to the root of your fork, or create a web service
(runtime Docker, Dockerfile path `deploy/docker/Dockerfile`, health check
`/api/health`, disk at `/app/data/uploads`) and a PostgreSQL database by hand
with the values from the file.

Change `NEXT_PUBLIC_BASE_URL` to your Render domain before the first build. A
persistent disk pins the service to one instance and disables zero-downtime
deploys; use `ARKIVEL_STORAGE=s3` to lift both limits. The file follows the
Render Blueprint spec and has not been deployed from this repository yet.

Owner setup: open the service shell in the Render dashboard and run
`node scripts/bootstrap-owner.mjs --username owner --email owner@example.com`.
