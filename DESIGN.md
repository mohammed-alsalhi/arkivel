# design

Arkivel should feel like a durable document tool, not a dashboard.

- lowercase interface copy where it reads naturally
- neutral surfaces, thin borders, restrained radius, and no blue accent system
- the supplied Arkivel SVG mark for product identity and a theme-aware SVG favicon
- a three-pane wiki shell: navigation, document, and graph/outline context
- four named skins on the same components: `editorial` uses warm paper and serif reading typography; `compact` uses a dense workspace and narrow sidebar; `folio` is a flat, document-first interface (hairline dividers, soft hover fills, a centered document column, compact icon navigation — closer to a notes app than a wiki) and `wiki` is the classic framed layout with bordered tables, portals, and the traditional palette; readers choose in settings
- the folio skin lowercases interface copy but never user-authored text (page titles, table cells, card titles)
- folio edits in place: the edit page mirrors the reader (big editable title, a property list, a bare body) with formatting in a `/` block menu and a selection toolbar; the wiki skin keeps its framed form with a toolbar
- one command palette (`⌘K` / `Ctrl+K`) for search, navigation, and the few global actions, instead of scattered toolbars
- one page chrome everywhere: a sticky top bar carrying the full trail (`spaces / parent / page`), edited-time, and page actions; one footer with a back link to the parent crumb. Pages pass a `trail` to `Page`; nothing hand-rolls breadcrumbs or back links
- the folio sidebar uses 2.25rem rounded nav rows with icon slots, uppercase section labels, a collapsible icon-only mode (`⌘B`), then workspace row, search / inbox / new page, library and collapsible spaces, settings in the footer; the wiki sidebar is the same tree as plain text
- scrollbars are the bespoke overlay kind: native bars hidden, hover-only thumbs, no gutter
- tables are fixed-layout with single-line 2.25rem rows and a pinned header; content is left-aligned; nothing in the flow casts a shadow or lifts on hover — only menus and dialogs get `shadow-md`
- text links and native controls before decorative buttons
- visible focus, semantic headings, keyboard access, reduced motion, and responsive single-column fallbacks

New UI must serve the core writing or retrieval path. If a control does not help create, find, read, revise, organize, export, authenticate, or operate the wiki, leave it out.
