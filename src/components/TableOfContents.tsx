type TocEntry = {
  level: number;
  text: string;
  id: string;
};

type Props = {
  html: string;
};

export default function TableOfContents({ html }: Props) {
  const headings = extractHeadings(html);

  if (headings.length < 3) return null;

  return (
    <div className="wiki-toc">
      <div className="wiki-toc-title">contents</div>
      <ol>
        {headings.map((h, i) => (
          <li key={i} style={{ marginInlineStart: `${(h.level - 1) * 0.75}rem` }}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function extractHeadings(html: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const regex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    if (!text) continue;

    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    entries.push({ level, text, id });
  }

  return entries;
}

/**
 * Adds id attributes to headings in HTML for anchor linking from TOC.
 */
export function addHeadingIds(html: string): string {
  return html.replace(/<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/gi, (match, level, attrs, content) => {
    const text = content.replace(/<[^>]*>/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Don't add if id already exists
    if (attrs.includes("id=")) return match;
    return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
  });
}
