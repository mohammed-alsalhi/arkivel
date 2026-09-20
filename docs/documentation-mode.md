# Documentation mode

Set `ARKIVEL_SITE_MODE=docs` and rebuild/restart the app. Collections are enabled automatically. All modes use the same articles, accounts, editor, permissions, and database.

1. Sign in as an administrator and apply the **documentation** kit at `/admin/kits`.
2. Create and publish articles using the normal editor.
3. Add rows to the `documentation` collection and link each row to its article.
4. Set **version**, **section**, **topic key**, and **reading order** on each row.

The home page and sidebar group published pages by section. Versions sort naturally with the highest label first (for example, `v2.0` before `v1.0`). Use consistently formatted version labels. Previous/next navigation follows reading order within the selected version.

Use a separate article for each version and the same topic key for equivalent pages. Switching versions opens that topic when available, otherwise the version overview. This is an explicit reading index, not automatic release snapshots. Unpublished, password-protected, redirect, and unlinked articles are excluded. Empty installations show a setup state.

Choose any skin independently: `folio`, `wiki`, `editorial`, or `compact` with `NEXT_PUBLIC_ARKIVEL_SKIN`. Settings and the command palette switch the reader preference; light and dark themes remain separate. Editorial uses warm paper tones and serif article text; compact uses tighter spacing, a narrower sidebar, and denser tables. Touch controls retain their minimum size.
