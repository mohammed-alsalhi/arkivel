import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMATS,
  EXPORT_STATUSES,
  createExportManifest,
  exportHardeningContract,
  sha256,
} from "../export-hardening";

describe("export hardening", () => {
  it("covers the focused export formats and statuses", () => {
    expect(EXPORT_FORMATS).toEqual(["markdown", "json", "zip"]);
    expect(EXPORT_STATUSES).toEqual(["completed", "failed"]);
  });

  it("creates export manifests with file counts, byte counts, checksums, warnings, and omissions", () => {
    const manifest = createExportManifest({
      files: [
        { content: "hello", path: "wiki-export.md" },
        { content: "world", path: "manifest.json" },
      ],
      format: "markdown",
      omittedData: ["draftContent", "apiKeys"],
      scope: { status: "published" },
      warnings: ["Draft content omitted."],
    });

    expect(manifest.fileCount).toBe(2);
    expect(manifest.byteCount).toBe(10);
    expect(manifest.files[0]).toMatchObject({
      checksum: sha256("hello"),
      path: "wiki-export.md",
    });
    expect(manifest.omittedData).toEqual(["draftContent", "apiKeys"]);
    expect(manifest.warnings).toEqual(["Draft content omitted."]);
  });

  it("declares downloadable export history reports", () => {
    expect(exportHardeningContract.history.downloadableReports).toBe(true);
    expect(exportHardeningContract.history.fields).toEqual(expect.arrayContaining([
      "format",
      "manifest",
      "warnings",
      "omittedData",
      "fileCount",
      "byteCount",
      "checksum",
    ]));
  });
});
