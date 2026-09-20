import matter from "gray-matter";
import JSZip from "jszip";

export interface ObsidianNote {
  title: string;
  slug: string;
  content: string;        // Markdown content
  contentHtml: string;    // Simple HTML conversion
  tags: string[];
  frontmatter: Record<string, unknown>;
}

/** Convert Obsidian [[wikilink]] to HTML anchor placeholders */
function resolveObsidianLinks(md: string): string {
  return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const text = label || target;
    const slug = target
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    return `[${text}](/articles/${slug})`;
  });
}

/** Very simple Markdown → HTML (headings, bold, italic, paragraphs) */
function markdownToHtml(md: string): string {
  return md
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[^]*?<\/li>[\n]?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^(?!<[a-z])(.+)$/gm, "<p>$1</p>")
    .replace(/\n{2,}/g, "\n");
}

function fileNameToSlug(name: string): string {
  return name
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function parseSingleFile(filename: string, rawContent: string): ObsidianNote {
  const { data, content } = matter(rawContent);
  const title = (data.title as string) || filename.replace(/\.md$/i, "");
  const slug = fileNameToSlug(filename);
  const tags: string[] = Array.isArray(data.tags)
    ? data.tags.map(String)
    : typeof data.tags === "string"
    ? data.tags.split(/[,\s]+/).filter(Boolean)
    : [];

  const resolved = resolveObsidianLinks(content);
  const contentHtml = markdownToHtml(resolved);

  return { title, slug, content: resolved, contentHtml, tags, frontmatter: data };
}

/** Parse a .zip vault and return all notes */
export async function parseObsidianVault(zipBuffer: Buffer): Promise<ObsidianNote[]> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const notes: ObsidianNote[] = [];

  const entries = Object.entries(zip.files).filter(
    ([name, file]) => name.endsWith(".md") && !file.dir
  );

  for (const [name, file] of entries) {
    const raw = await file.async("string");
    const filename = name.split("/").pop()!;
    notes.push(parseSingleFile(filename, raw));
  }

  return notes;
}

/** Parse a single Markdown file */
export function parseObsidianFile(filename: string, content: string): ObsidianNote {
  return parseSingleFile(filename, content);
}
