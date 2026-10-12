# deploying arkivel

Arkivel is one long-running Node process (Next.js, `output: standalone`) plus
PostgreSQL. Uploads go to a persistent disk (`ARKIVEL_STORAGE=local`, the
default) or to any S3-compatible bucket (`ARKIVEL_STORAGE=s3`). The container
runs `prisma migrate deploy` on start, serves on port 3000, and answers
`GET /api/health`. Backups use `pg_dump` from inside the image.

That shape is why the Docker image is the default: it runs the same way on a
laptop, a VPS, and every container host, and it is what CI builds and smoke
tests on each release. Everything here reuses `deploy/docker/Dockerfile`; no
target needs its own build.

| target | what you get | data stays with you | files |
| --- | --- | --- | --- |
| [docker](docker/) | Compose: app + PostgreSQL on one machine | yes | `Dockerfile`, `compose.yml` |
| [vps](vps/) | the Compose stack behind Caddy with automatic HTTPS | yes | `compose.yml`, `Caddyfile` |
| [fly](fly/) | the image on Fly Machines with a volume and Fly Postgres | your Fly account | `fly.toml` |
| [railway](railway/) | the image on Railway with a volume and Railway Postgres | your Railway account | `railway.json` |
| [render](render/) | the image on Render with a disk and Render Postgres | your Render account | `render.yaml` |
| [vercel](vercel/) | serverless build; needs external PostgreSQL and S3 storage | partly | notes only |

Pick `docker` or `vps` when you own the machine. Pick `fly`, `railway`, or
`render` when you want a managed host without changing anything about the app.
Vercel works but is not a first-class target: there is no persistent disk and
no long-lived process, so you must bring PostgreSQL and a bucket. Cloudflare
Workers is not a target; the app needs a filesystem and Node APIs it does not
provide.

## before any target

Set the build-time public values (`ARKIVEL_SITE_MODE` and every
`NEXT_PUBLIC_*`) before building and rebuild when they change. Set the runtime
values (`DATABASE_URL`, `ARKIVEL_REGISTRATION`, storage, OAuth) on the host.
The root `.env.example` lists all of them.

After the first start, create the owner account inside the running container:

```sh
printf '%s' "$owner_password" | <exec into app> node scripts/bootstrap-owner.mjs --username owner --email owner@example.com
```

Each target's README shows its exec command.

## published image

Every release publishes `ghcr.io/mohammed-alsalhi/arkivel:vX.Y.Z` built with the
default wiki mode and branding, plus a portable `.tar.gz` on the GitHub release.
Use it when the defaults fit; build from source when you need other public
values, because Next.js compiles them into the bundle.
