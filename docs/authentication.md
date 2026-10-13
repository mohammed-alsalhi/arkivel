# authentication and owner setup

Arkivel keeps users, roles, and sessions in its own PostgreSQL database. Sign-in methods are local passwords and optional GitHub or Google OAuth. Roles are viewer, editor, and admin.

## create the first owner

Apply migrations with `npm run db:deploy`, then run the setup command against that instance's `DATABASE_URL` (loaded from `.env`). Public registration never creates an administrator, even on an empty database.

```bash
printf 'Owner password: '
IFS= read -r -s owner_password
printf '\n'
printf '%s' "$owner_password" | npm run setup:owner -- --username owner --email owner@example.com
unset owner_password
```

Usernames are 3 to 30 characters of letters, numbers, and underscores. Passwords need at least 12 characters and at most 72 UTF-8 bytes. The password is read from stdin so it stays out of command arguments and shell history. Sign in at `/login` afterwards.

With Compose, run the same command inside the app container:

```bash
printf '%s' "$owner_password" | docker compose -f deploy/docker/compose.yml exec -T app node scripts/bootstrap-owner.mjs --username owner --email owner@example.com
```

Setup takes a database lock before checking for an existing administrator, so two concurrent runs cannot both create an owner. It refuses to replace an existing administrator, overwrite a password, or promote an existing account.

To add members without opening registration, use `npm run setup:user -- --username teammate --email teammate@example.com --role viewer` the same way (or `node scripts/bootstrap-owner.mjs --member ...` in the container).

## registration

`ARKIVEL_REGISTRATION=closed` is the default; any value other than `open` stays closed. Existing users can always log in. Set it to `open` and restart to let new local or OAuth users register once an owner exists. New users get the viewer role; administrators change roles on the users screen.

Registration controls account creation, not content visibility. Anonymous read routes stay public unless `ARKIVEL_ACCESS=private` is set; see [private instances](private-self-hosting.md).

## oauth

Set `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (the instance's public origin), and the provider's client ID and secret from `.env.example`. A provider appears on the login page only when it is fully configured. The callback URL is `https://your-wiki.example/api/auth/callback/github` or `/google`.

An external identity is keyed by provider and provider account ID. A matching email is never enough to link to a local account; sign in with the local login instead. Existing linked identities keep working while registration is closed; new identities follow the registration policy. Arkivel does not store provider access or refresh tokens.

A successful OAuth login creates an ordinary Arkivel session. Role changes apply immediately, deleting a session from settings revokes it, logout clears both local and OAuth sessions, and OAuth sessions expire after 30 days.

Administrator access always needs an authenticated admin session or token. There is no development bypass.
