/** The `/` block menu: what it offers and how a typed query narrows it.
 *  Pure so the editor component only has to map ids to editor commands. */

export type SlashCommandId =
  | "text"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "quote"
  | "codeBlock"
  | "divider"
  | "table"
  | "image"
  | "wikiLink";

export type SlashCommand = {
  id: SlashCommandId;
  label: string;
  hint: string;
  /** Extra words a query may match, beyond the label. */
  keywords: string[];
  group: "basic" | "media";
};

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  { id: "text", label: "text", hint: "plain paragraph", keywords: ["paragraph", "p"], group: "basic" },
  { id: "heading1", label: "heading 1", hint: "large section heading", keywords: ["h1", "title"], group: "basic" },
  { id: "heading2", label: "heading 2", hint: "medium section heading", keywords: ["h2"], group: "basic" },
  { id: "heading3", label: "heading 3", hint: "small section heading", keywords: ["h3"], group: "basic" },
  { id: "bulletList", label: "bulleted list", hint: "simple list", keywords: ["ul", "bullet", "list"], group: "basic" },
  { id: "orderedList", label: "numbered list", hint: "list with numbers", keywords: ["ol", "ordered", "list"], group: "basic" },
  { id: "quote", label: "quote", hint: "capture a quotation", keywords: ["blockquote"], group: "basic" },
  { id: "codeBlock", label: "code", hint: "code block with highlighting", keywords: ["pre", "snippet"], group: "basic" },
  { id: "divider", label: "divider", hint: "horizontal rule", keywords: ["hr", "rule", "separator"], group: "basic" },
  { id: "table", label: "table", hint: "3 × 3 table with a header row", keywords: ["grid"], group: "media" },
  { id: "image", label: "image", hint: "upload a picture", keywords: ["photo", "picture", "upload"], group: "media" },
  { id: "wikiLink", label: "page link", hint: "link another page", keywords: ["wiki", "link", "[["], group: "media" },
];

/** Commands whose label or keywords start with, then contain, the query. */
export function filterSlashCommands(query: string, commands: readonly SlashCommand[] = SLASH_COMMANDS): SlashCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...commands];

  const matches = (command: SlashCommand, test: (value: string) => boolean) =>
    test(command.label) || command.keywords.some(test);

  const prefixed = commands.filter((command) => matches(command, (value) => value.startsWith(needle)));
  const contained = commands.filter(
    (command) => !prefixed.includes(command) && matches(command, (value) => value.includes(needle)),
  );
  return [...prefixed, ...contained];
}

/** The `/query` a user is typing at the end of a text block, or null. A slash
 *  only counts at the start of the block or after whitespace, and the query
 *  ends at the first space — `a/b` and `/two words` never open the menu. */
export function getSlashQuery(textBeforeCursor: string): { query: string; slashOffset: number } | null {
  const match = /(?:^|\s)\/([^\s/]*)$/.exec(textBeforeCursor);
  if (!match) return null;
  const slashOffset = match.index + (match[0].startsWith("/") ? 0 : 1);
  return { query: match[1], slashOffset };
}
