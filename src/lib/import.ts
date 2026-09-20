import { marked } from "marked";
import { XMLParser } from "fast-xml-parser";

export type ImportFormat = "md" | "txt" | "json" | "html" | "xml";

export type ImportedArticle = {
  title: string;
  content: string;
  contentRaw?: string;
  excerpt?: string;
};

export type ImportResult = {
  filename: string;
  success: boolean;
  title?: string;
  slug?: string;
  error?: string;
};

export type JsonArticleSchema = {
  title: string;
  content: string;
  format?: "html" | "markdown";
  excerpt?: string;
};

export function detectFormat(filename: string): ImportFormat | null {
  const ext = filename.toLowerCase().split(".").pop();
  const map: Record<string, ImportFormat> = {
    md: "md",
    markdown: "md",
    txt: "txt",
    text: "txt",
    json: "json",
    html: "html",
    htm: "html",
    xml: "xml",
  };
  return map[ext || ""] || null;
}

export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtml(para.replace(/\n/g, "<br>"))}</p>`)
    .join("");
}

function extractFrontmatter(
  content: string,
  filename: string
): { title: string; body: string } {
  const fmRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(fmRegex);
  if (match) {
    const fm = match[1];
    const body = match[2];
    const titleLine = fm.match(/^title:\s*(.+)$/m);
    return {
      title: titleLine
        ? titleLine[1].trim().replace(/^["']|["']$/g, "")
        : titleFromFilename(filename),
      body,
    };
  }
  const h1Match = content.match(/^#\s+(.+)$/m);
  return {
    title: h1Match ? h1Match[1].trim() : titleFromFilename(filename),
    body: h1Match ? content.replace(/^#\s+.+\n*/, "") : content,
  };
}

function extractHtmlTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match) return stripHtml(h1Match[1]).trim();
  return null;
}

function extractBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : html;
}

function wikitextToHtml(wikitext: string): string {
  let html = wikitext;

  // Headings: ======X====== (h6) down to ==X== (h2)
  html = html.replace(/^======\s*(.+?)\s*======$/gm, "<h6>$1</h6>");
  html = html.replace(/^=====\s*(.+?)\s*=====$/gm, "<h5>$1</h5>");
  html = html.replace(/^====\s*(.+?)\s*====$/gm, "<h4>$1</h4>");
  html = html.replace(/^===\s*(.+?)\s*===$/gm, "<h3>$1</h3>");
  html = html.replace(/^==\s*(.+?)\s*==$/gm, "<h2>$1</h2>");

  // Bold and italic: '''bold''', ''italic''
  html = html.replace(/'''(.+?)'''/g, "<strong>$1</strong>");
  html = html.replace(/''(.+?)''/g, "<em>$1</em>");

  // Wiki links: [[Target|Display]] or [[Target]]
  html = html.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_match, target, display) => {
    return `<a href="/articles/${target.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}" class="wiki-link" data-wiki-link="${escapeHtml(target.trim())}">${escapeHtml(display.trim())}</a>`;
  });
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_match, target) => {
    return `<a href="/articles/${target.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}" class="wiki-link" data-wiki-link="${escapeHtml(target.trim())}">${escapeHtml(target.trim())}</a>`;
  });

  // Unordered lists: * item
  html = html.replace(/^(\*+)\s+(.+)$/gm, (_match, stars, text) => {
    const depth = stars.length;
    return `<li style="margin-left:${(depth - 1) * 20}px">${text}</li>`;
  });

  // Ordered lists: # item
  html = html.replace(/^(#+)\s+(.+)$/gm, (_match, hashes, text) => {
    const depth = hashes.length;
    return `<li style="margin-left:${(depth - 1) * 20}px">${text}</li>`;
  });

  // Paragraphs: double newlines
  html = html
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Don't wrap blocks that are already HTML elements
      if (/^<(h[1-6]|li|ul|ol|div|table|p)\b/i.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  return html;
}

export function parseMediaWikiXml(content: string): ImportedArticle[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => name === "page",
  });

  const parsed = parser.parse(content);

  // Navigate the MediaWiki XML structure
  const mediawiki = parsed.mediawiki || parsed;
  const pages = mediawiki.page;

  if (!pages || (Array.isArray(pages) && pages.length === 0)) {
    throw new Error("No pages found in MediaWiki XML");
  }

  const pageList = Array.isArray(pages) ? pages : [pages];

  return pageList
    .map((page: { title?: string; revision?: { text?: string | { "#text"?: string } } }) => {
      const title = page.title;
      if (!title) return null;

      // Get the latest revision text
      const revision = page.revision;
      let rawText = "";
      if (revision) {
        if (typeof revision.text === "string") {
          rawText = revision.text;
        } else if (revision.text && typeof revision.text === "object" && "#text" in revision.text) {
          rawText = revision.text["#text"] || "";
        }
      }

      if (!rawText.trim()) return null;

      const htmlContent = wikitextToHtml(rawText);

      return {
        title,
        content: htmlContent,
        contentRaw: rawText,
        excerpt: stripHtml(htmlContent).substring(0, 200),
      };
    })
    .filter(Boolean) as ImportedArticle[];
}

export function parseImportFile(
  filename: string,
  content: string
): ImportedArticle {
  const format = detectFormat(filename);
  if (!format) throw new Error(`Unsupported file format: ${filename}`);
  if (!content.trim()) throw new Error(`File is empty: ${filename}`);

  switch (format) {
    case "md": {
      const { title, body } = extractFrontmatter(content, filename);
      const html = markdownToHtml(body);
      return {
        title,
        content: html,
        contentRaw: body,
        excerpt: stripHtml(html).substring(0, 200),
      };
    }
    case "txt": {
      const title = titleFromFilename(filename);
      const html = textToHtml(content);
      return {
        title,
        content: html,
        excerpt: content.substring(0, 200),
      };
    }
    case "html": {
      const bodyContent = extractBody(content);
      const title = extractHtmlTitle(content) || titleFromFilename(filename);
      return {
        title,
        content: bodyContent,
        excerpt: stripHtml(bodyContent).substring(0, 200),
      };
    }
    case "json": {
      const parsed = JSON.parse(content);
      const items: JsonArticleSchema[] = Array.isArray(parsed)
        ? parsed
        : [parsed];
      if (items.length === 1) {
        const data = items[0];
        if (!data.title || !data.content) {
          throw new Error("JSON must have 'title' and 'content' fields");
        }
        const html =
          data.format === "markdown"
            ? markdownToHtml(data.content)
            : data.content;
        return {
          title: data.title,
          content: html,
          contentRaw: data.format === "markdown" ? data.content : undefined,
          excerpt: data.excerpt || stripHtml(html).substring(0, 200),
        };
      }
      // For arrays, return only the first — the caller handles arrays separately
      const first = items[0];
      if (!first.title || !first.content) {
        throw new Error("Each JSON object must have 'title' and 'content' fields");
      }
      const html =
        first.format === "markdown"
          ? markdownToHtml(first.content)
          : first.content;
      return {
        title: first.title,
        content: html,
        contentRaw: first.format === "markdown" ? first.content : undefined,
        excerpt: first.excerpt || stripHtml(html).substring(0, 200),
      };
    }
    case "xml": {
      const articles = parseMediaWikiXml(content);
      if (articles.length === 0) {
        throw new Error("No pages found in MediaWiki XML");
      }
      return articles[0];
    }
  }
}

export function parseImportFileAll(
  filename: string,
  content: string
): ImportedArticle[] {
  const format = detectFormat(filename);
  if (format === "xml") {
    return parseMediaWikiXml(content);
  }
  if (format === "json") {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((data: JsonArticleSchema, i: number) => {
        if (!data.title || !data.content) {
          throw new Error(
            `JSON item ${i} must have 'title' and 'content' fields`
          );
        }
        const html =
          data.format === "markdown"
            ? markdownToHtml(data.content)
            : data.content;
        return {
          title: data.title,
          content: html,
          contentRaw: data.format === "markdown" ? data.content : undefined,
          excerpt: data.excerpt || stripHtml(html).substring(0, 200),
        };
      });
    }
  }
  return [parseImportFile(filename, content)];
}
