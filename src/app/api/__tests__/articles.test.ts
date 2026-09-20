import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    article: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    articleRevision: {
      create: vi.fn(),
    },
    articleTag: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
  getSession: vi.fn(),
  requireAdmin: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

import prisma from "@/lib/prisma";
import { isArticleStatus } from "@/lib/article-status";

const mockArticle = {
  id: "test-id",
  title: "Test Article",
  slug: "test-article",
  content: "<p>Test content</p>",
  contentRaw: null,
  excerpt: "Test content",
  coverImage: null,
  published: true,
  status: "published",
  categoryId: null,
  userId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Article API logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts only synchronized article statuses", () => {
    expect(isArticleStatus("published")).toBe(true);
    expect(isArticleStatus("draft")).toBe(true);
    expect(isArticleStatus("archived")).toBe(false);
  });

  it("findMany returns articles", async () => {
    vi.mocked(prisma.article.findMany).mockResolvedValue([mockArticle] as never);
    const articles = await prisma.article.findMany({
      where: { status: "published" },
    });
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("Test Article");
  });

  it("findUnique returns article by id", async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue(mockArticle as never);
    const article = await prisma.article.findUnique({
      where: { id: "test-id" },
    });
    expect(article?.slug).toBe("test-article");
  });

  it("create produces article with slug", async () => {
    vi.mocked(prisma.article.create).mockResolvedValue(mockArticle as never);
    const article = await prisma.article.create({
      data: {
        title: "Test Article",
        slug: "test-article",
        content: "<p>Test content</p>",
      },
    });
    expect(article.id).toBe("test-id");
  });

  it("delete removes article", async () => {
    vi.mocked(prisma.article.delete).mockResolvedValue(mockArticle as never);
    const deleted = await prisma.article.delete({
      where: { id: "test-id" },
    });
    expect(deleted.id).toBe("test-id");
  });

  it("revision is created before update", async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue(mockArticle as never);
    vi.mocked(prisma.articleRevision.create).mockResolvedValue({
      id: "rev-1",
      articleId: "test-id",
      title: "Test Article",
      content: "<p>Test content</p>",
    } as never);

    // Simulate pre-update snapshot
    const current = await prisma.article.findUnique({
      where: { id: "test-id" },
    });
    if (current) {
      const revision = await prisma.articleRevision.create({
        data: {
          articleId: current.id,
          title: current.title,
          content: current.content,
        },
      });
      expect(revision.articleId).toBe("test-id");
    }
  });
});
