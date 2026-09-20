# Private instances and portable storage

Set `ARKIVEL_ACCESS=private` in the application's runtime environment and restart. The default is `public`; unrecognized values fail closed. This setting is independent of wiki/docs/media mode and the skin.

Private mode requires an active internal viewer, editor, or administrator for pages, APIs, search, feeds, share links, image optimization, and file routes. Login, registration policy, configured OAuth callbacks, static application assets, robots, and a minimal health endpoint remain accessible. The login shell contains no collection, category, article, or library navigation. Private responses are not publicly cacheable; robots disallows indexing. An expired, deleted, or revoked session no longer grants access. A database failure returns an error rather than opening access.

Registration and visibility are separate controls. Keep `ARKIVEL_REGISTRATION=closed` for an operator-managed instance. Use `npm run setup:owner` first, then add a member without opening registration:

```sh
printf 'Member password: '
IFS= read -r -s member_password
printf '\n'
printf '%s' "$member_password" | npm run setup:user -- --username teammate --email teammate@example.com --role viewer
unset member_password
```

The same command inside the app container is `node scripts/bootstrap-owner.mjs --member ...`. Roles are viewer, editor, or admin. Existing accounts are never overwritten. Invitation emails, Clerk, and Supabase Auth adapters are not included; local passwords and GitHub/Google OAuth remain available. Provider callbacks still require real provider credentials and a deployment-level sign-in check.

## storage

`ARKIVEL_STORAGE=local` stores uploads outside the public directory, under `ARKIVEL_UPLOAD_DIR` (default `data/uploads`). Compose mounts a persistent uploads volume. Local storage requires persistent disk and is rejected on Vercel. Keep this directory backed up with PostgreSQL.

`ARKIVEL_STORAGE=s3` uses the official AWS client and the standard AWS credential chain. Set `ARKIVEL_S3_BUCKET`, `ARKIVEL_S3_REGION`, and optionally `ARKIVEL_S3_ENDPOINT` for an S3-compatible service. Set `ARKIVEL_S3_FORCE_PATH_STYLE=true` if required by that service. Use a private bucket, a least-privilege identity limited to GetObject/PutObject for this instance, and HTTPS outside local tests. Do not configure public-read policies. Bucket provisioning and live provider verification require your own account credentials.

Local and S3 uploads use `/api/files/...` URLs and pass through instance authorization. Raster images can display inline; other types, including HTML and SVG, download as attachments with sandbox and no-sniff headers. Uploads are limited to 20 MiB. Stable object keys allow moving local files into a bucket without rewriting those URLs; copy and verify objects before changing providers.

The legacy `vercel` provider preserves existing public Blob behavior. If no provider is selected, an existing Blob token selects it; otherwise storage defaults to local. Private mode rejects new public Blob uploads. **Changing instance visibility cannot revoke an existing public Blob URL or a previously distributed export.** Migrate existing public attachments to private storage and remove their public originals before treating that content as private. External image URLs in articles are also outside Arkivel's access boundary.

## backups

Stop writers before taking a coordinated database/files snapshot. Run from a source checkout with dependencies installed and PostgreSQL client tools matching the server major version (or a supported newer version):

```sh
npm run backup -- /secure/backups/arkivel-2026-09-20
```

The destination must not already exist. A full local backup requires an existing upload directory; a missing path is rejected instead of silently omitting attachments. The backup includes a custom-format PostgreSQL dump, local uploads, table counts, and SHA-256 checksums. An `INCOMPLETE` marker remains after failure. Connection credentials travel through the process environment, never command arguments. Direct PostgreSQL connections are preferred over transaction poolers for operational tooling.

For Compose, the uploads live in a Docker volume, not the host checkout. Run the included tooling in a one-off container that mounts the same volume, with the app stopped and PostgreSQL still running:

```sh
mkdir -p backups
docker compose stop app
docker compose run --rm --no-deps --user 0 --entrypoint node \
  -v "$PWD/backups:/backups" app scripts/backup/create.mjs /backups/snapshot
docker compose run --rm --no-deps --user 0 --entrypoint chown \
  -v "$PWD/backups:/backups" app -R "$(id -u):$(id -g)" /backups/snapshot
docker compose start app
```

The temporary backup container runs as root to read the private volume and write the host backup; the web app continues to run as its unprivileged user. Keep `backups` off public serving paths and copy the result to protected off-host storage. Do not run the host backup command against an unrelated empty uploads directory when the app uses a Docker volume.

For S3/Blob, `--database-only` explicitly produces a database-only backup. Enable bucket versioning/backup separately; remote objects are not copied by this command. Store backups off-host with encryption and restricted access: the dump contains account password hashes, sessions, and application content. These commands do not install a backup schedule.

Rehearse into a disposable empty database and a new uploads directory:

```sh
RESTORE_DATABASE_URL=postgresql://user:password@localhost:5432/arkivel_restore_test \
  npm run backup:restore-check -- /secure/backups/arkivel-2026-09-20 /secure/restore-test/uploads
```

Provide real credentials through a shell-local environment or secret manager rather than saving them in shell history. The command checks all backup hashes before restoring, refuses the source or any database containing user tables, runs pg_restore in one transaction without dropping existing objects, and verifies table counts and upload checksums. It retains the restored database for inspection. Do not point an app at it until inspection passes. Restore only trusted backups: PostgreSQL dumps can contain executable SQL.

CI runs `scripts/check-backup.mjs` on disposable fixtures, comparing restored article content, account credentials, and upload bytes, and checking corruption and overwrite refusals. It drops only the uniquely named database it created.

## container releases

Published releases build and publish `ghcr.io/mohammed-alsalhi/arkivel:vVERSION` and an immutable commit tag. The workflow validates that the tag matches package metadata and belongs to main, builds the image, and checks the non-root runtime, upload permissions, and Prisma tooling. Pull requests affecting the container build run the same image checks without publishing.

The standard image uses default Arkivel public branding and the wiki build configuration. Build from source with the existing Docker build arguments for custom public branding, canonical URL, or a different built default skin; Next.js embeds those public values at build time. Runtime access policy, database, OAuth credentials, and storage settings remain per instance. The initial published architecture is linux/amd64.

Each release also includes a portable `arkivel-vVERSION-linux-amd64.tar.gz` image and its SHA-256 checksum. Verify it with `sha256sum -c`, then use `docker load -i` to import it. These public release downloads work independently of container-registry authentication. GitHub initially makes container packages private; the package owner must enable public visibility before anonymous `docker pull` works.
