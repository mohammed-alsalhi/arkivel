# docker

`Dockerfile` is the one image every target uses. The root `.dockerignore` is
its ignore file (Docker reads it from the build context root, like
`.gitignore`). `compose.yml` runs that image next to PostgreSQL 16 with two
named volumes, `postgres_data` and `uploads`.

From the repository root, with `.env` copied from `.env.example`:

```sh
docker compose -f deploy/docker/compose.yml --env-file .env up -d --build
```

Compose reads `.env` from the directory of the compose file unless
`--env-file` points elsewhere. Rerun with `--build` after changing any
`ARKIVEL_SITE_MODE` or `NEXT_PUBLIC_*` value; restarting an old image keeps its
compiled settings. Use `-p <name>` to run several instances with separate
volumes.

To run a published image instead of building:

```sh
ARKIVEL_IMAGE=ghcr.io/mohammed-alsalhi/arkivel:v1.1.0 \
  docker compose -f deploy/docker/compose.yml --env-file .env up -d
```

Optional `.env` keys read only by Compose: `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`POSTGRES_DB` (default `arkivel` for all three; instances created with the old
root `docker-compose.yml` must set all three to `wiki`, `wiki_password`,
`wiki`), `ARKIVEL_PORT` (host port, default 3000), `ARKIVEL_IMAGE`.

Owner account, backups, and private mode:

```sh
printf '%s' "$owner_password" | docker compose -f deploy/docker/compose.yml exec -T app \
  node scripts/bootstrap-owner.mjs --username owner --email owner@example.com
```

See [docs/private-self-hosting.md](../../docs/private-self-hosting.md) for
backups of the volumes and `ARKIVEL_ACCESS=private`.

Build the image on its own:

```sh
docker build -f deploy/docker/Dockerfile -t arkivel .
```

Pass `--build-arg` for each public value you want compiled in.
