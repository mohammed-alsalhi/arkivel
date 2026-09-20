# authentication and owner setup

Arkivel stores users, roles, and sessions in its own PostgreSQL database. Database hosting and identity hosting are independent choices: a Supabase PostgreSQL connection works as a database without enabling Supabase Auth. The shipped identity methods are local passwords and optional GitHub/Google OAuth. Clerk, Supabase Auth, invitations, and authenticated account linking are not implemented yet.

## create the first owner

Apply migrations with `npm run db:deploy`, then run the operator command against that instance's `DATABASE_URL` (loaded from `.env`). Public registration never creates an administrator, even on an empty database.

```bash
printf 'Owner password: '
IFS= read -r -s owner_password
printf '\n'
printf '%s' "$owner_password" | npm run setup:owner -- --username owner --email owner@example.com
unset owner_password
```

Use a 3–30 character username containing letters, numbers, and underscores. The password must have at least 12 characters and at most 72 UTF-8 bytes (bcrypt's input limit). The password travels through stdin, not command arguments or shell history. Sign in at `/login` afterward.

For Compose, use the running application's database configuration:

```bash
printf 'Owner password: '
IFS= read -r -s owner_password
printf '\n'
printf '%s' "$owner_password" | docker compose exec -T app node scripts/bootstrap-owner.mjs --username owner --email owner@example.com
unset owner_password
```

Setup acquires a PostgreSQL transaction lock before checking for an existing administrator. Concurrent setup attempts cannot create multiple initial owners. It refuses to replace an existing administrator, overwrite a password, or promote an existing matching username/email. Operators with an existing admin account should use that account. No schema migration is needed for this change.

## registration

`ARKIVEL_REGISTRATION=closed` is the default. Existing users can still log in. Set it to exactly `open` and restart the application to permit new local or OAuth users after an owner exists. New users always receive the viewer role; an administrator manages roles in the existing users screen. Unknown values stay closed. The login, register, and account menu reflect the same policy as the API.

This controls account creation, not document visibility. Anonymous read routes remain public. Do not treat closed registration as a private-instance access gate.

## OAuth

Set `NEXTAUTH_SECRET`, `NEXTAUTH_URL` to the instance's public origin, and the chosen provider's client ID/secret from `.env.example`. Providers appear on the login page only when fully configured. Configure callback URLs as `https://your-wiki.example/api/auth/callback/github` or `/google`.

An external identity is identified by its provider and provider account ID. An existing email match is never enough to link to a local account: use its existing login instead. Existing linked OAuth identities work when registration is closed; new identities follow the registration policy. New accounts and provider links are written atomically. Arkivel does not need or persist provider access/refresh tokens for login.

Successful OAuth login creates an ordinary Arkivel database session. The encrypted NextAuth cookie carries only its opaque session reference, and shared server authorization reloads the current internal user and role. Password cookies and personal API tokens use the same internal roles. Role changes take effect immediately; deleting a session from settings revokes its access. Logout revokes both local and OAuth sessions and clears OAuth cookie chunks. OAuth sessions expire after 30 days and then require sign-in again.

After upgrading, OAuth users must sign in again: old JWTs without an Arkivel session reference are intentionally rejected. Existing local sessions and password hashes remain valid. New registrations now require longer passwords; existing passwords continue to work.

`ADMIN_SECRET` is a legacy development guard, not an owner password. In production, administrator access always requires an authenticated admin. In development only, omitting `ADMIN_SECRET` enables the existing local admin bypass; set it when testing real authorization.

## validation

Unit tests cover registration policy, malformed requests, duplicate identities, signed/forged OAuth cookies, current database roles, and revocation. `scripts/check-owner-setup.mjs` exercises competing owner setup commands against an empty disposable database after migrations. Provider callback exchanges still require real per-instance provider credentials for an end-to-end deployment check.
