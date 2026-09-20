# roadmap

Arkivel 1.1.0 provides a knowledge base, typed collections, and a media library on one backend. The configurability model is described in `docs/modules-and-collections.md`.

Near-term work:

- keep editing, search, links, revisions, imports, exports, and authentication reliable
- verify backup/restore and database migrations on disposable databases
- measure larger collections before replacing in-memory filtering with server queries
- improve accessibility and performance when measured regressions appear
- add property types only when a concrete workflow needs them

Collaboration, marketplaces, third-party plugins, gamification, and social features are outside the product boundary. AI remains optional for media mood picks.

## portability and managed hosting

1. Separate the marketing website from the application and export the API reference.
2. Explicit owner setup, closed-by-default registration, and shared revocable local/OAuth sessions are implemented. Private-instance read access, local/S3 uploads, and backup restore rehearsal are implemented. Hosted customer provisioning remains separate.
3. Add Clerk and Supabase Auth integrations with verified identities and revocation behavior.
4. Expand skins and runtime branding without duplicating feature or permission logic.
5. Verify live S3 provider configuration and operate scheduled off-host backups; versioned container publication is automated.
6. Build hosted provisioning, backups, and verified subdomain/custom-domain routing around isolated instances.

The hosting service is separate from this repository. Hosted signup, billing, and customer provisioning are not implemented in the application.
