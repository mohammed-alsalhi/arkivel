# changelog

## unreleased

- remove leftover settings: user preferences other than skin, maintenance / read-only / background-task modes, the `ADMIN_SECRET` development bypass, the Vercel build and Blob storage paths, kit skin recommendations, and the unused `NEXT_PUBLIC_APP_VERSION`
- define public branding defaults once in `src/lib/config.ts`; Compose and the Dockerfile only pass values through
- drop the duplicate prisma seed, the unwired media release check, and the design qa screenshots
- move the Dockerfile and Compose stack under `deploy/docker/` and add vps, fly, railway, render, and vercel deployment configs next to them

## 1.1.0

- add private-instance read access with a login-only shell and revocable session checks
- add private local and S3-compatible uploads, safe download headers, and persistent Compose storage
- add operator member setup while registration stays closed
- add checksummed backups, guarded restore rehearsal, and container release automation

## 1.0.0

Initial public release.

- rich-text articles, wiki links, search, revisions, import, and export
- wiki, versioned documentation, and film/series library modes on one backend
- folio, wiki, editorial, and compact skins with light/dark themes and reader preferences
- documentation versions, sections, topic-preserving navigation, and previous/next pages
- typed collections with table, board, list, and calendar views and starter kits
- operator owner setup, closed-by-default registration, optional oauth, and revocable sessions
- role-based access, personal access tokens, audit logs, and public api v1
- generated api reference exports and configurable modules
- self-hosting with postgresql, prisma migrations, standalone docker, and vercel support
