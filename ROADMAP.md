# roadmap

Arkivel 1.0.0 provides a knowledge base, typed collections, and a media library on one backend. The configurability model is described in `docs/modules-and-collections.md`.

Near-term work:

- keep editing, search, links, revisions, imports, exports, and authentication reliable
- verify backup/restore and database migrations on disposable databases
- measure larger collections before replacing in-memory filtering with server queries
- improve accessibility and performance when measured regressions appear
- add property types only when a concrete workflow needs them

Collaboration, marketplaces, third-party plugins, gamification, and social features are outside the product boundary. AI remains optional for media mood picks.

## portability and managed hosting

1. Separate the marketing website from the application and export the API reference.
2. Unify local and external authentication around internal user IDs; replace first-registration admin assignment with explicit setup and add registration/privacy controls.
3. Add Clerk and Supabase Auth integrations with verified identities and revocation behavior.
4. Expand skins and runtime branding without duplicating feature or permission logic.
5. Add portable object storage and publish versioned application artifacts.
6. Build hosted provisioning, backups, and verified subdomain/custom-domain routing around isolated instances.

The hosting service is separate from this repository. Hosted signup, billing, and customer provisioning are not implemented in the application.
