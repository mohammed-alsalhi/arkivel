# fly

Fly runs the Docker image on a Machine with a volume for uploads. One machine
only: a local upload volume cannot be shared across machines, so keep
`min_machines_running = 1` and do not scale out, or switch to
`ARKIVEL_STORAGE=s3` (Tigris on Fly works) and then scale freely.

```sh
fly launch --no-deploy --copy-config --config deploy/fly/fly.toml
fly postgres create --name arkivel-db
fly postgres attach arkivel-db --app arkivel      # sets DATABASE_URL
fly volumes create arkivel_uploads --size 10 --app arkivel
fly secrets set NEXTAUTH_SECRET="$(openssl rand -hex 32)" --app arkivel
fly deploy --config deploy/fly/fly.toml
printf '%s' "$owner_password" | fly ssh console --app arkivel -C \
  "node scripts/bootstrap-owner.mjs --username owner --email owner@example.com"
```

Edit `app`, `primary_region`, and the `[build.args]` in `fly.toml` first; the
public URL is compiled in. The config is written from the Fly docs and has not
been deployed from this repository yet.
