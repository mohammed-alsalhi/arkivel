# private instances, storage, and backups

## private access

Set `ARKIVEL_ACCESS=private` in the runtime environment and restart. The default is `public`; unrecognized values fail closed. The setting is independent of the site mode and skin.

In private mode every page, API route, search, feed, share link, image optimization, and file route requires a signed-in viewer, editor, or administrator. Login, registration (per policy), configured OAuth callbacks, static assets, robots, and a minimal health endpoint stay reachable. Private responses are not publicly cacheable and robots disallows indexing. A revoked, expired, or deleted session loses access immediately, and a database failure returns an error rather than opening access.

Registration and visibility are separate controls. Keep `ARKIVEL_REGISTRATION=closed` and add members with `npm run setup:user`; see [authentication](authentication.md).

Switching an instance to private does not recall exports or external image URLs that were already shared.

## storage

`ARKIVEL_STORAGE=local` (the default) stores uploads outside the public directory under `ARKIVEL_UPLOAD_DIR` (default `data/uploads`). Compose mounts a persistent volume there. Back this directory up together with the database.

`ARKIVEL_STORAGE=s3` uses the AWS SDK and the standard AWS credential chain. Set `ARKIVEL_S3_BUCKET`, `ARKIVEL_S3_REGION`, and for S3-compatible services `ARKIVEL_S3_ENDPOINT` and, if required, `ARKIVEL_S3_FORCE_PATH_STYLE=true`. Use a private bucket and an identity limited to GetObject and PutObject on it.

Both providers serve uploads through `/api/files/...` with the instance's access checks. Raster images display inline; everything else, including HTML and SVG, downloads as an attachment with sandbox and no-sniff headers. Uploads are limited to 20 MiB. Object keys are stable, so local files can be copied into a bucket without rewriting URLs; verify the copy before switching providers.

## backups

Stop writers, then run from a source checkout with dependencies installed and PostgreSQL client tools matching the server major version:

```sh
npm run backup -- /secure/backups/arkivel-2026-09-20
```

The destination must not exist yet. The backup holds a custom-format PostgreSQL dump, local uploads, table counts, and SHA-256 checksums; a missing upload directory is an error rather than a silent omission, and a failed run leaves an `INCOMPLETE` marker. Credentials come from the environment, never arguments. With S3 storage, pass `--database-only`: the command never copies remote objects, so enable and verify bucket versioning or another object backup first, or a restore cannot recover uploaded files.

With Compose the uploads live in a Docker volume, so run the tool in a one-off container that mounts it, with the app stopped and PostgreSQL running:

```sh
mkdir -p backups
compose="docker compose -f deploy/docker/compose.yml --env-file .env"
$compose stop app
$compose run --rm --no-deps --user 0 --entrypoint node \
  -v "$PWD/backups:/backups" app scripts/backup/create.mjs /backups/snapshot
$compose run --rm --no-deps --user 0 --entrypoint chown \
  -v "$PWD/backups:/backups" app -R "$(id -u):$(id -g)" /backups/snapshot
$compose start app
```

The dump contains password hashes, sessions, and all content: store it off-host, encrypted, with restricted access. Nothing here installs a schedule.

Rehearse a restore into a disposable empty database and a new uploads directory:

```sh
RESTORE_DATABASE_URL=postgresql://user:password@localhost:5432/arkivel_restore_test \
  npm run backup:restore-check -- /secure/backups/arkivel-2026-09-20 /secure/restore-test/uploads
```

The check verifies every hash first, refuses the source database or any database that already has user tables, restores in one transaction without dropping anything, compares table counts and upload checksums, and keeps the restored database for inspection. Restore only backups you trust: a PostgreSQL dump can contain executable SQL. CI runs the same rehearsal on disposable fixtures.

## published images

Each release publishes `ghcr.io/mohammed-alsalhi/arkivel:vX.Y.Z`, an immutable commit tag, and a portable `arkivel-vX.Y.Z-linux-amd64.tar.gz` with its SHA-256 checksum (`sha256sum -c`, then `docker load -i`). The workflow checks that the tag matches `package.json`, is on `main`, runs as a non-root user, can write uploads, and has the Prisma and `pg_dump` tooling.

The published image is built with the default public branding and wiki mode. Build from `deploy/docker/Dockerfile` with its build arguments for other public values, because Next.js compiles them into the bundle. Database, access policy, OAuth, and storage stay runtime settings.
