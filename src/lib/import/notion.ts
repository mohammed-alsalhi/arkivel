/**
 * Notion import — converts Notion page blocks to HTML.
 * The admin import route supplies the caller's Notion access token.
 */

interface NotionBlock {
  id: string;
  type: string;
  [key: string]: unknown;
}

interface NotionRichText {
  plain_text: string;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
  };
  href?: string | null;
}

function richTextToHtml(richText: NotionRichText[]): string {
  return richText
    .map((t) => {
      let text = t.plain_text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      if (t.annotations?.bold) text = `<strong>${text}</strong>`;
      if (t.annotations?.italic) text = `<em>${text}</em>`;
      if (t.annotations?.code) text = `<code>${text}</code>`;
      if (t.annotations?.strikethrough) text = `<s>${text}</s>`;
      if (t.href) text = `<a href="${t.href}">${text}</a>`;
      return text;
    })
    .join("");
}

function blockToHtml(block: NotionBlock): string {
  const type = block.type;
  const data = block[type] as Record<string, unknown>;
  if (!data) return "";

  const rt = (data.rich_text as NotionRichText[] | undefined) ?? [];

  switch (type) {
    case "heading_1":
      return `<h1>${richTextToHtml(rt)}</h1>`;
    case "heading_2":
      return `<h2>${richTextToHtml(rt)}</h2>`;
    case "heading_3":
      return `<h3>${richTextToHtml(rt)}</h3>`;
    case "paragraph":
      return `<p>${richTextToHtml(rt)}</p>`;
    case "bulleted_list_item":
      return `<li>${richTextToHtml(rt)}</li>`;
    case "numbered_list_item":
      return `<li>${richTextToHtml(rt)}</li>`;
    case "code": {
      const lang = (data.language as string) ?? "";
      return `<pre><code class="language-${lang}">${richTextToHtml(rt)}</code></pre>`;
    }
    case "quote":
      return `<blockquote>${richTextToHtml(rt)}</blockquote>`;
    case "divider":
      return "<hr />";
    case "callout":
      return `<div class="callout">${richTextToHtml(rt)}</div>`;
    case "image": {
      const img = data as Record<string, unknown>;
      const src =
        ((img.external as Record<string, string> | undefined)?.url) ||
        ((img.file as Record<string, string> | undefined)?.url) ||
        "";
      const caption = ((img.caption as NotionRichText[]) || [])
        .map((t) => t.plain_text)
        .join("");
      return `<figure><img src="${src}" alt="${caption}" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
    }
    default:
      return richTextToHtml(rt) ? `<p>${richTextToHtml(rt)}</p>` : "";
  }
}

export function notionBlocksToHtml(blocks: NotionBlock[]): string {
  const lines: string[] = [];
  let inUl = false;
  let inOl = false;

  for (const block of blocks) {
    if (block.type === "bulleted_list_item") {
      if (!inUl) { lines.push("<ul>"); inUl = true; }
      if (inOl) { lines.push("</ol>"); inOl = false; }
    } else if (block.type === "numbered_list_item") {
      if (!inOl) { lines.push("<ol>"); inOl = true; }
      if (inUl) { lines.push("</ul>"); inUl = false; }
    } else {
      if (inUl) { lines.push("</ul>"); inUl = false; }
      if (inOl) { lines.push("</ol>"); inOl = false; }
    }
    lines.push(blockToHtml(block));
  }
  if (inUl) lines.push("</ul>");
  if (inOl) lines.push("</ol>");

  return lines.join("\n");
}

export async function fetchNotionPage(
  accessToken: string,
  pageId: string
): Promise<{ title: string; html: string }> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  const [pageRes, blocksRes] = await Promise.all([
    fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers }),
    fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, { headers }),
  ]);

  if (!pageRes.ok) throw new Error(`Notion page fetch failed: ${pageRes.status}`);
  if (!blocksRes.ok) throw new Error(`Notion blocks fetch failed: ${blocksRes.status}`);

  const page = await pageRes.json();
  const blocksData = await blocksRes.json();

  // Extract title from page properties
  let title = "Untitled";
  const props = page.properties ?? {};
  for (const prop of Object.values(props) as Record<string, unknown>[]) {
    if ((prop as Record<string, unknown>).type === "title") {
      const titleArr = (prop as Record<string, NotionRichText[]>).title ?? [];
      title = titleArr.map((t) => t.plain_text).join("") || "Untitled";
      break;
    }
  }

  const html = notionBlocksToHtml(blocksData.results as NotionBlock[]);
  return { title, html };
}
