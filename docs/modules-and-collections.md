# modules and collections

Design record for making one Arkivel codebase serve very different deployments — a personal wiki, a team knowledge base, notes-plus-tasks, world-building — without growing a table per feature again.

## decision

Arkivel is configurable at three levels, in this order of preference:

1. **the core is fixed.** Articles, wiki links, spaces (categories), tags, search, revisions, users, sessions, audit, admin, settings. Every deployment has it. It is not a module.
2. **collections are the engine.** One small generic data model — a collection with a typed property schema, items, and views — covers tasks, reading lists, CRMs, trackers, and whatever comes next as *templates*, not code. This is how Notion gets its range from a tiny model.
3. **modules are for genuinely different code paths.** Graph, assets, import, export, the public API, feeds, share links, and later collections itself. A module is a folder that declares its routes, navigation, palette commands, docs, settings, and schema, and a deployment enables a set of them.

Starter kits (a preset of enabled modules plus seeded collections and a skin) replace the idea of a marketplace. There are no third-party plugins.

## why not features

v5 answered every need with a feature: 96 tables, each with routes and UI, all shipped to every deployment. The 6.0 rewrite exists because that collapsed. The rule going forward: **tables scale with engines, not with features.** Before adding a model, ask whether a collection template covers it.

## modules

`src/modules/` holds one folder per module plus a registry.

```ts
// src/modules/types.ts
export type ModuleId = "graph" | "assets" | "import" | "export" | "api" | "feeds" | "share" | "collections" | "media";

export type NavSection = "top" | "library" | "spaces" | "footer";

export type NavEntry = {
  label: string;
  href: string;
  icon: IconName;          // a key into the shared inline icon set
  section: NavSection;
  order: number;
  requires?: "member" | "admin";
};

export type PaletteCommand = {
  label: string;
  href: string;
  keywords: string[];
  requires?: "member" | "admin";
};

export type ModuleDefinition = {
  id: ModuleId;
  name: string;            // lowercase interface copy
  description: string;
  /** path prefixes this module owns; disabled → 404 */
  routes: string[];
  nav: NavEntry[];
  commands: PaletteCommand[];
  docs: { help?: string; features: string[] };
  /** default enablement when ARKIVEL_MODULES is unset */
  defaultEnabled: boolean;
};
```

Resolution of the enabled set, per request, cached:

1. `ARKIVEL_MODULES` env (comma list) — the deployment's hard default; unset means every module's `defaultEnabled`.
2. `SystemSetting` row `modules` with `config: { enabled: ModuleId[] }` — the admin override from `/admin/modules`.

`getEnabledModules()` (server) and `useEnabledModules()` (client, fed from the root layout) are the only ways to read it. Pages inside a module call `requireModule(id)` (server: `notFound()` when disabled); API routes call the same and return 404. The sidebar, command palette, help page, and features page are **composed from the registry**, never hand-listed.

Existing features move into modules with no behaviour change: `graph` (`/graph`, `/api/graph`, the article context rail's graph tab), `assets` (`/assets`, `/api/assets`, `/api/upload`), `import` (`/import/**`, `/api/import/**`), `export` (`/export`, `/api/export/**`), `api` (`/api/v1/**`, `/api-docs`), `feeds` (`/feed.xml`, `/feed/atom`), `share` (`/share/**`, share-token routes). `media` (`/discover`, `/api/media/**`) is off by default: it needs the `collections` module and a `watchlist` collection, so the watchlist kit enables it.

## collections

Three tables, added by migration, owned by the `collections` module.

```prisma
model Collection {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  icon        String?
  description String?
  categoryId  String?                      // the space it lives in
  category    Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  schema      Json                         // PropertyDefinition[]
  items       CollectionItem[]
  views       CollectionView[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([categoryId])
}

model CollectionItem {
  id           String     @id @default(cuid())
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  articleId    String?    @unique          // an item may be a real page
  article      Article?   @relation(fields: [articleId], references: [id], onDelete: SetNull)
  title        String
  properties   Json                        // Record<propertyId, value>, validated against schema
  sortOrder    Int        @default(0)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([collectionId, sortOrder])
  @@index([collectionId, updatedAt])
}

model CollectionView {
  id           String     @id @default(cuid())
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  slug         String
  name         String
  kind         String                       // "table" | "board" | "list" | "calendar"
  config       Json                         // ViewConfig
  isDefault    Boolean    @default(false)
  sortOrder    Int        @default(0)

  @@unique([collectionId, slug])
}
```

Property types (`src/modules/collections/properties.ts`): `title` (exactly one, maps to `item.title`), `text`, `number`, `select` (options with a tone), `multi_select`, `date`, `checkbox`, `url`, `person` (user id), `page` (article id), `relation` (item ids in another collection), `created_time`, `updated_time`. Every write validates `properties` against the collection's schema; unknown keys are dropped, wrong types rejected. Dates must be real calendar dates, and relation writes validate that the target collection exists and selected items belong to it. Item patches lock the row before reading and merging properties so concurrent edits preserve unrelated fields.

View config: `{ filters: Filter[], sorts: Sort[], groupBy?: propertyId, visible: propertyId[] }`. Table is the first view kind; board (grouped by a select), list, and calendar (by a date) follow.

Routes: `/collections` (index), `/collections/[slug]` (default view), `/collections/[slug]/[view]`, `/collections/[slug]/items/[id]` (item page: the linked article when there is one, otherwise the property form). API under `/api/collections/**` mirrors it. Collections appear in the sidebar under their space (or a "collections" section when unspaced), in the palette, and in search.

The table view uses the shared `DataTable` with 44px edit targets, compact property columns, a pinned header, and a pinned title column on desktop. It scrolls horizontally on narrow screens. Folio and Wiki use the same structure and editing behavior with their own surface tokens.

Collection choice fields use a shared searchable label picker: option colors stay consistent in cells, forms, filters, and property settings. Arrow keys and Enter select an option; Escape dismisses the picker and returns focus. Multiple selections remain open while saving, and page/relation searches distinguish loading, empty results, and retryable errors. Text and number cells save on blur or Enter; Escape cancels their draft. Dates retain the native date input.

## starter kits

A kit is `{ modules: ModuleId[], skin, seed }` in `src/kits/`. `ARKIVEL_KIT` picks one for a fresh database; `/admin/kits` can apply a kit's seed later (idempotent, like the demo seed). Kits: `wiki` (core + graph + api), `notes-and-tasks` (core + collections with a tasks collection: status / due / priority / assignee, table + board views), `team-knowledge-base` (everything), `course-workspace` (linked courses and coursework, with table, board, list, and calendar views), and `watchlist` (a film and series library: a `watchlist` collection with type / status / moods / year / rating / watched on and table, board, and list views, plus an `episodes` collection bound to it for per-episode marks; with assets, export, and import).

The `watchlist` kit is the worked example of using Arkivel for a domain that is not a wiki: set `NEXT_PUBLIC_ARKIVEL_NAME` to the product name, apply the kit from `/admin/kits`, and the same image, database, and admin become a media library. Nothing in the kit is code; it is two templates and a seed.

## course workspace and course-sync import

The `courses` and `coursework` templates use the existing three collection tables. Applying `course-workspace` creates empty `courses` and `coursework` collections and binds `coursework.course` to the real courses collection id. Reapplying a kit preserves existing collections. A standalone coursework template uses a text course field until it is linked to a courses collection.

| Collection | Properties |
| --- | --- |
| courses | course title, code, term, source website, stable source id, personal notes |
| coursework | title, status, due date, priority, course, kind, personal notes |
| coursework deadline metadata | exact deadline (`due_at`), timezone, availability (`available_at`), late deadline (`late_until`), confirmed reservation (`reservation_at`) |
| coursework source metadata | source id, source list, URL, source status, capture timestamp, source notes, numeric score, completion evidence |

Dates in `due` remain calendar dates. Optional exact times are normalized ISO timestamps with an explicit offset; the optional IANA timezone records the intended local timezone. Availability, full-credit due dates, late windows, and confirmed reservations remain separate. Scores are stored as supplied numbers and never imply completion or a reservation. Course hubs and coursework can each link to an article through the existing `articleId` field.

Use **Import course sync** on a coursework collection, choose the scraper's canonical `google-tasks-input.json`, review the preview, and apply it. This reads an existing metadata file; it does not log into course platforms or fetch assessment content. The endpoint is `POST /api/collections/:id/import-course-sync`, where `:id` can be a collection id or slug:

```json
{
  "dryRun": true,
  "source": {
    "task_list": "Example term",
    "generated_at": "2026-09-07T12:00:00Z",
    "tasks": [
      {
        "id": "canvas:assignment:example",
        "title": "[CS 101] Read the syllabus",
        "due": "2026-09-08",
        "status": "needsAction",
        "source_url": "https://example.edu/courses/101"
      }
    ]
  }
}
```

The import requires collection-editor access and the collections module. `dryRun` defaults to `true`; set it to `false` to apply. The response reports `created`, `updated`, `unchanged`, `skipped`, `coursesCreated`, a preview of up to 100 rows, and warnings. Counts include the full batch, limited to 2,000 tasks and approximately 2 MB of JSON. The complete source is validated before writes, and apply runs in one database transaction. Preview and apply each recompute against current state.

Task `id` and `title` are required; source status accepts only `needsAction` or `completed`, and an omitted status means unknown. `due` and `source_url` are optional, so undated administrative actions work. `notes` goes into `source_notes`, preserving personal `notes`. Optional fields are `course`, `kind` (`assignment`, `exam`, `reading`, or `action`), `score`, `due_at`, `timezone`, `available_at`, `late_until`, and `reservation_at`. When `course` is omitted, an explicit `[COURSE CODE] ` title prefix supplies it. Unknown fields are ignored.

Import identity is scoped to the destination collection, `task_list`, and task `id`; retain these values across refreshes. Course identity is scoped to the courses collection, source list, and course label. Import creates missing course rows when the course property is a relation. Changing source list or course label creates a separate identity, so use consistent term and course names.

Repeated input is a no-op. A record with an older `generated_at` than its stored capture time is skipped. An omitted item is never deleted or archived, and omitted fields preserve the last verified value. Explicit source completion can close work once; subsequent snapshots preserve personal completion, progress, and manual reopening. Unknown/open source status never removes existing completion proof. Imported titles and supplied source metadata may update. Collection and item locks serialize concurrent imports with ordinary property patches.

## phases

1. **baseline** — `prisma/migrations` created from the live database, `prisma migrate deploy` in the Dockerfile instead of `db push`, `npm run db:*` scripts. *(this record)*
2. **module registry** — `src/modules`, existing features moved in, `/admin/modules`, composed navigation/palette/docs, `ARKIVEL_MODULES`.
3. **collections** — migration, models, property validation, API, index + table view + item page, sidebar/palette/search integration.
4. **tasks kit** — the first template on the engine, with a board view.
5. **views** — list and calendar; relations across collections.

## rules

- never `prisma db push` against an existing database; every schema change is a migration rehearsed on a branch database first.
- a module may not import from another module; both go through the core.
- no new table without first asking whether a collection template covers the need.

## media site mode

`ARKIVEL_SITE_MODE=media` swaps the wiki shell for a film and series library (Vistara) without touching the backend. The layers, bottom up:

| layer | what it owns | where |
| --- | --- | --- |
| collections | the `watchlist` and `episodes` templates and the kit that seeds them | `src/modules/collections/templates.ts`, `src/kits/` |
| media module | metadata: TMDB with a bundled catalogue fallback, OMDB ratings, the mood ids | `src/modules/media/` (imports no other module) |
| library | the library contract (the shapes the pages consume) and the adapter onto collection rows | `src/media/` (composes both modules, like `src/kits/apply.ts`) |
| api | `/api/media/**`: health, watchlist, episodes, titles, tmdb detail, mood, import, library backup | `src/app/api/media/` |
| shell | the library, discover, title, mood, and import pages, the navigation, the dark coral look | `src/components/media/`, `src/styles/media-site.css`, the media block in `tokens.css` |

Reads are public like a wiki; every write requires a signed-in collection editor, so the library's `health` reports `can_edit` and the pages hide their controls when it is false. Kit rows carry `sample: true` until they are edited, which is what "remove sample titles" deletes. The mode forces the `collections` and `media` modules on regardless of `ARKIVEL_MODULES`.

### media release checks

Use a dedicated local database (never the wiki database), apply migrations, seed the smoke account, and start media mode in its own terminal. The database name for the destructive-fixture check must begin with `arkivel_vistara_release_` and both database and app must be on loopback:

```sh
DATABASE_URL=postgresql://mohammed@localhost:5432/arkivel_vistara_release_20260920 BASE_URL=http://127.0.0.1:3107 node scripts/check-media.mjs
```

The check applies the watchlist kit and exercises authentication, catalogue search, status, episode marks, mood picks, backup preview, repeat restore, metadata and exact timestamp preservation, offline saved-title details, and transaction rollback. It leaves synthetic records in that disposable database. `SMOKE_ADMIN_PASSWORD` overrides the smoke account password.

Backup restore uses a single collection transaction, preserves the original added time and exact watched timestamps, and imports saved descriptive metadata without requiring TMDB. Existing titles keep their fields; missing episode marks are added. Older watchlist kits gain the `watched_at` and `release_date` properties during restore. Watched timestamps fall back to the edited date if a collection editor changes the day. The library is shared within one deployment; reads are public and writes require an editor account. Very large backups still perform individual inserts and may reach the transaction timeout; failure rolls the entire restore back.

For Vercel, create a separate Vistara project from this repository with a dedicated database. Set `ARKIVEL_SITE_MODE=media`, `NEXT_PUBLIC_ARKIVEL_NAME=Vistara`, `NEXT_PUBLIC_BASE_URL` to its deployment origin, and its own `DATABASE_URL`, `ADMIN_SECRET`, and authentication configuration before building. Apply migrations explicitly, create the administrator account, and apply the watchlist kit. Do not reuse the WorldWiki project linkage, database, or secrets. Provider keys are optional; without TMDB, discovery uses the bundled catalogue and restored titles remain viewable from saved metadata.
