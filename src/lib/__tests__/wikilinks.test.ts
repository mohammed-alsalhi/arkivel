import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    article: {
      findMany: vi.fn(),
    },
    alias: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";
import { resolveWikiLinks, getBacklinks } from "../wikilinks";

const mockFindMany = vi.mocked(prisma.article.findMany);
const mockAliasFindMany = vi.mocked(prisma.alias.findMany);

describe("resolveWikiLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAliasFindMany.mockResolvedValue([] as never);
  });

  it("returns HTML unchanged when no wiki links", async () => {
    const html = "<p>Hello world</p>";
    const result = await resolveWikiLinks(html);
    expect(result).toBe(html);
  });

  it("leaves valid wiki links unchanged", async () => {
    const html =
      '<a class="wiki-link" data-wiki-link="Test Article">Test Article</a>';
    mockFindMany.mockResolvedValue([
      { slug: "test-article" },
    ] as never);
    const result = await resolveWikiLinks(html);
    expect(result).not.toContain("wiki-link-broken");
  });

  it("marks broken wiki links", async () => {
    const html =
      '<a class="wiki-link" data-wiki-link="Missing Article">Missing Article</a>';
    mockFindMany.mockResolvedValue([] as never);
    const result = await resolveWikiLinks(html);
    expect(result).toContain("wiki-link-broken");
  });
});

describe("getBacklinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no backlinks", async () => {
    mockFindMany.mockResolvedValue([] as never);
    const result = await getBacklinks("test-article");
    expect(result).toEqual([]);
  });

  it("finds articles that link to the given slug", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "1",
        title: "Linking Article",
        slug: "linking-article",
        content:
          '<a class="wiki-link" data-wiki-link="Test Article">Test Article</a>',
      },
      {
        id: "2",
        title: "Other Article",
        slug: "other-article",
        content: "<p>No links here</p>",
      },
    ] as never);
    const result = await getBacklinks("test-article");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("linking-article");
  });
});
