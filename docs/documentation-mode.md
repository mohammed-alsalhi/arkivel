# documentation mode

Set `ARKIVEL_SITE_MODE=docs`, rebuild, and restart. Collections are enabled automatically. Articles, accounts, the editor, permissions, and the database are the same as in wiki mode.

1. sign in as an administrator and apply the **documentation** kit at `/admin/kits`
2. write and publish articles with the normal editor
3. add a row to the `documentation` collection for each article and link them
4. set **version**, **section**, **topic key**, and **reading order** on each row

The home page and sidebar group published pages by section. Versions sort with the highest label first (`v2.0` before `v1.0`), so keep labels consistently formatted. Previous and next links follow reading order within the selected version.

Use one article per version and the same topic key for equivalent pages. Switching versions opens that topic when it exists, otherwise the version overview. This is an explicit reading index, not an automatic snapshot: unpublished, password-protected, redirect, and unlinked articles are left out, and an empty installation shows a setup state.

Any skin works with docs mode; set the default with `NEXT_PUBLIC_ARKIVEL_SKIN`.
