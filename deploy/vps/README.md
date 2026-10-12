# vps

Any Linux box with Docker: Hetzner, DigitalOcean, a home server. The stack is
`deploy/docker/compose.yml` plus a Caddy overlay that terminates HTTPS and
proxies to the app. Caddy obtains and renews the certificate itself.

1. Point a DNS A/AAAA record at the server.
2. Clone the repository, copy `.env.example` to `.env`, and set at least
   `NEXT_PUBLIC_BASE_URL=https://wiki.example.com`,
   `ARKIVEL_DOMAIN=wiki.example.com`, and a `POSTGRES_PASSWORD`.
3. Start:

```sh
docker compose -f deploy/docker/compose.yml -f deploy/vps/compose.yml --env-file .env up -d --build
```

Ports 80 and 443 are the only ones exposed; PostgreSQL and the app stay on the
Compose network. Owner setup, backups, and upgrades are the same commands as in
[docker](../docker/README.md) with the extra `-f deploy/vps/compose.yml`.

Upgrade: `git pull`, then rerun the start command. Migrations apply on boot.
