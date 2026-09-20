import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const articleFindMany = vi.fn();
const articleCount = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/articles/architecture-decisions",
  useRouter: () => ({ refresh: () => undefined }),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    article: {
      findMany: articleFindMany,
      count: articleCount,
    },
  },
}));

import ArticleRightSidebar from "@/components/ArticleRightSidebar";
import WikiHome from "@/components/WikiHome";
import Sidebar from "@/components/layout/Sidebar";

describe("focused wiki shell", () => {
  beforeEach(() => {
    articleFindMany.mockReset();
    articleCount.mockReset();
  });

  it("renders the Arkivel mark, focused library links, search, and spaces", () => {
    const html = renderToStaticMarkup(
      <Sidebar
        brandName="Arkivel"
        logoMark="/brand/arkivel-logo.svg"
        articleCount={12}
        categories={[
          {
            id: "engineering",
            name: "engineering",
            slug: "engineering",
            children: [
              {
                id: "decisions",
                name: "decisions",
                slug: "decisions",
              },
            ],
          },
        ]}
      />,
    );

    expect(html).toContain('src="/brand/arkivel-logo.svg"');
    expect(html).toContain('aria-label="Search Arkivel"');
    expect(html).toContain("wiki-sidebar-search-trigger");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("all pages");
    expect(html).toContain("engineering");
    expect(html).toContain("decisions");
    expect(html).toContain("wiki-sidebar-section-title");
    expect(html).not.toContain("command center");
    expect(html).not.toContain("marketplace");
  });

  it("renders the sidebar expanded on the server with a collapse toggle", () => {
    const html = renderToStaticMarkup(
      <Sidebar brandName="Arkivel" logoMark="/brand/arkivel-logo.svg" categories={[]} />,
    );

    // The persisted collapse state is only read after mount, so the markup
    // never carries the collapsed class or the tooltip.
    expect(html).not.toContain("wiki-sidebar-collapsed");
    expect(html).not.toContain("wiki-sidebar-tooltip");
    expect(html).toContain("wiki-sidebar-collapse-toggle");
    expect(html).toContain('aria-keyshortcuts="Meta+B Control+B"');
    expect(html).toContain('aria-label="collapse sidebar"');
    expect(html).toContain("no spaces yet");
  });

  it("keeps the article context rail to graph and outline", () => {
    const html = renderToStaticMarkup(
      <ArticleRightSidebar
        slug="architecture-decisions"
        backlinks={[{ id: "source", title: "engineering handbook", slug: "engineering-handbook" }]}
      />,
    );

    expect(html).toContain('aria-label="Page context"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain(">graph</button>");
    expect(html).toContain(">outline</button>");
    expect(html).not.toContain(">links</button>");
  });

  it("renders the wiki root as a compact page index", async () => {
    articleFindMany.mockResolvedValue([
      {
        id: "article-1",
        title: "architecture decisions",
        slug: "architecture-decisions",
        excerpt: "records the key architecture decisions for arkivel.",
        updatedAt: new Date("2026-08-30T12:00:00.000Z"),
        category: { name: "decisions", slug: "decisions" },
      },
    ]);
    articleCount.mockResolvedValue(1);

    const html = renderToStaticMarkup(await WikiHome());

    expect(html).toContain("<h1>home</h1>");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain("recently updated");
    expect(html).toContain("architecture decisions");
    expect(html).toContain('/articles/architecture-decisions');
    expect(html).not.toContain("reading queue");
    expect(html).not.toContain("command center");
  });
});
