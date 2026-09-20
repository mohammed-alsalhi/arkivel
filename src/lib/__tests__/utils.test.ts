import { describe, it, expect } from "vitest";
import {
  generateSlug,
  formatDate,
  formatRelativeDate,
  truncateText,
  stripHtml,
  wordCount,
  readingTime,
  formatFileSize,
  formatNumber,
  isExternalUrl,
  generateExcerpt,
  getInitials,
  pluralize,
  classNames,
} from "../utils";

describe("generateSlug", () => {
  it("converts title to lowercase kebab-case", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });
  it("strips special characters", () => {
    expect(generateSlug("Hello, World! (2024)")).toBe("hello-world-2024");
  });
  it("trims leading/trailing hyphens", () => {
    expect(generateSlug("--hello--")).toBe("hello");
  });
  it("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });
  it("collapses multiple separators", () => {
    expect(generateSlug("a   b   c")).toBe("a-b-c");
  });
  it("normalizes accented latin characters", () => {
    expect(generateSlug("Café déjà vu")).toBe("cafe-deja-vu");
  });
});

describe("formatDate", () => {
  it("formats Date object", () => {
    const result = formatDate(new Date("2024-03-15"));
    expect(result).toContain("2024");
    expect(result).toContain("March");
  });
  it("formats date string", () => {
    const result = formatDate("2024-01-15");
    expect(result).toContain("January");
  });
});

describe("formatRelativeDate", () => {
  it('returns "just now" for recent times', () => {
    expect(formatRelativeDate(new Date())).toBe("just now");
  });
  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeDate(fiveMinAgo)).toBe("5 minutes ago");
  });
  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeDate(twoHoursAgo)).toBe("2 hours ago");
  });
  it("handles singular forms", () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000);
    expect(formatRelativeDate(oneMinAgo)).toBe("1 minute ago");
  });
});

describe("truncateText", () => {
  it("returns short text unchanged", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });
  it("truncates at word boundary", () => {
    expect(truncateText("hello world foo", 12)).toBe("hello...");
  });
  it("uses custom suffix", () => {
    expect(truncateText("hello world foo", 12, "…")).toBe("hello wor…");
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world"
    );
  });
  it("decodes HTML entities", () => {
    expect(stripHtml("&amp; &lt; &gt; &quot; &#039;")).toBe('& < > " \'');
  });
  it("collapses whitespace", () => {
    expect(stripHtml("hello   world")).toBe("hello world");
  });
  it("handles nbsp", () => {
    expect(stripHtml("hello&nbsp;world")).toBe("hello world");
  });
});

describe("wordCount", () => {
  it("counts words in plain text", () => {
    expect(wordCount("hello world")).toBe(2);
  });
  it("counts words in HTML", () => {
    expect(wordCount("<p>one two three</p>")).toBe(3);
  });
  it("returns 0 for empty/whitespace", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   ")).toBe(0);
  });
});

describe("readingTime", () => {
  it("returns minimum 1 minute", () => {
    expect(readingTime("short")).toEqual({ minutes: 1, text: "1 min read" });
  });
  it("calculates based on word count", () => {
    const text = Array(400).fill("word").join(" ");
    expect(readingTime(text).minutes).toBe(2);
  });
  it("accepts custom WPM", () => {
    const text = Array(100).fill("word").join(" ");
    expect(readingTime(text, 100).minutes).toBe(1);
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });
  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });
  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
  });
  it("handles negative", () => {
    expect(formatFileSize(-1)).toBe("0 B");
  });
});

describe("formatNumber", () => {
  it("formats with commas", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
  it("handles small numbers", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

describe("isExternalUrl", () => {
  it("detects http URLs", () => {
    expect(isExternalUrl("http://example.com")).toBe(true);
  });
  it("detects https URLs", () => {
    expect(isExternalUrl("https://example.com")).toBe(true);
  });
  it("rejects relative paths", () => {
    expect(isExternalUrl("/articles/test")).toBe(false);
  });
  it("rejects anchors", () => {
    expect(isExternalUrl("#section")).toBe(false);
  });
});

describe("generateExcerpt", () => {
  it("returns short text unchanged", () => {
    expect(generateExcerpt("<p>Hello</p>")).toBe("Hello");
  });
  it("truncates at sentence boundary", () => {
    const html = "<p>" + "A".repeat(50) + ". " + "B".repeat(200) + "</p>";
    const excerpt = generateExcerpt(html, 100);
    expect(excerpt.endsWith(".")).toBe(true);
  });
});

describe("getInitials", () => {
  it("extracts first letters", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });
  it("handles single name", () => {
    expect(getInitials("Alice")).toBe("A");
  });
  it("limits to 2 chars", () => {
    expect(getInitials("A B C D")).toBe("AB");
  });
});

describe("pluralize", () => {
  it("uses singular for 1", () => {
    expect(pluralize(1, "article")).toBe("1 article");
  });
  it("uses plural for > 1", () => {
    expect(pluralize(5, "article")).toBe("5 articles");
  });
  it("uses custom plural", () => {
    expect(pluralize(0, "person", "people")).toBe("0 people");
  });
});

describe("classNames", () => {
  it("joins strings", () => {
    expect(classNames("a", "b")).toBe("a b");
  });
  it("filters falsy values", () => {
    expect(classNames("a", false, null, undefined, "b")).toBe("a b");
  });
  it("returns empty for no args", () => {
    expect(classNames()).toBe("");
  });
});
