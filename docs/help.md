# user guide

## write

Create a page from **new page**. Add a title, body, optional space and tags, then save (`⌘S` / `Ctrl+S` also saves). In the folio skin the page is the editor: type `/` on an empty line to insert a block (headings, lists, quote, code, divider, table, image, page link), select text for the formatting toolbar, and set status, tags, or the url in the property list under the title. The wiki skin shows the same fields as a framed form with a toolbar. Both support standard formatting, lists, links, wiki links, images, tables, code blocks, undo, and redo. Local draft recovery protects unsaved work.

## connect

Type `[[Page title]]` to link another article. Article pages show backlinks and a local graph. Use categories for hierarchy and tags for cross-cutting labels.

## find

Press `⌘K` (`Ctrl+K` on Windows and Linux) or click the sidebar search to open the command palette: type to find pages, jump to all pages, tags, the graph, or settings, and run actions like toggling dark mode. The full `/search` page accepts the same query. Multi-word searches require every word and rank title matches first. Browse all pages, categories, tags, the graph, or recent changes when the exact title is unknown.

## personalize

Settings has an appearance section with two skins: **folio**, a flat document interface, and **wiki**, the classic framed layout. Pick one or follow the site default; the choice is remembered in your browser and on your account. The theme toggle in the sidebar switches light and dark mode.

## revise

Every save records the previous version. **history** lists revisions; **diff** compares them; **blame** traces lines; administrators can restore a revision.

## move data

The import page accepts Markdown, text, HTML, JSON, and MediaWiki XML, with dedicated Notion and Obsidian flows. Export supports Markdown, JSON, and ZIP. Verify a full export before maintenance.

## operate

Administrators manage users, categories, tags, redirects, imports, audit logs, maintenance mode, and read-only mode. Review active sessions in settings. The health page reports application and database status.

Starter kits (**admin → starter kits**) apply a preset in one step: a module list plus seeded collections such as a tasks board or a reading list. Applying a kit is safe to repeat — existing collections are left alone.

For courses, apply **course workspace**, then open **coursework**. Switch between table, board, list, and calendar; click a property to edit it or open an item for full details. **filter / sort** saves the view's rules. The calendar keeps undated work below the month grid.

Choose **import course data** and select your scraper's `google-tasks-input.json`. Preview the changes, then import them. Repeating an export does not duplicate items, older snapshots are skipped, and partial exports preserve existing work. Personal notes stay separate from source notes; a score alone never marks work complete. See [the import contract](modules-and-collections.md#course-workspace-and-course-sync-import) for automation and optional deadline fields.
