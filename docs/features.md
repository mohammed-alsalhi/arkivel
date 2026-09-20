# supported features

Arkivel supports:

- one page chrome on every route: a sticky trail (`spaces / parent / page`) with edited-time and actions, and a footer that always leads back to the parent

- rich-text articles with images, tables, code blocks, and wiki links, written in place in folio with a `/` block menu and a selection toolbar
- backlinks, local/global graph views, categories, tags, search, and recent changes
- a `⌘K` / `Ctrl+K` command palette that searches pages, jumps to any section, and toggles the theme or skin
- four skins on the same components — `folio`, `wiki`, `editorial`, and `compact` — chosen per user in settings, plus light and dark modes
- revision history, diff, blame, restore, redirects, and draft share links
- Markdown, JSON, ZIP, Notion, and Obsidian import/export paths
- users, roles, sessions, local credentials, and optional OAuth
- assets, audit logs, health checks, maintenance mode, and read-only mode
- a documented `/api/v1` contract and OpenAPI document, plus personal access tokens (`Authorization: Bearer ark_…`) that make every `/api` route usable from scripts and other apps with the token owner's role; created and revoked under `/settings/tokens`, logged to the audit trail, with `ARKIVEL_API_CORS_ORIGINS` for browser apps on other origins
- collections with table, board, list, and calendar views, searchable typed properties, filters, sorting, and linked records
- starter kits (`documentation`, `wiki`, `notes and tasks`, `team knowledge base`, `course workspace`, `watchlist`) applied from `/admin/kits`: a module preset plus seeded collections, idempotent by collection slug
- course-sync metadata imports with preview, stable source identity, linked course hubs, and separate deadlines, scores, and completion evidence

It intentionally does not include AI assistants, live collaboration, marketplaces, plugins, workspaces, social feeds, learning systems, gamification, personal dashboards, maps, canvases, or presentation tools.

- documentation mode with versioned section navigation, topic keys, and previous/next reading links over published articles
