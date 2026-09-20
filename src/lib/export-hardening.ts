import { createHash } from "crypto";
import prisma from "@/lib/prisma";

export const EXPORT_MANIFEST_SCHEMA_VERSION = "arkivel.export-manifest.v1";

export const EXPORT_FORMATS = ["markdown", "json", "zip"] as const;
export const EXPORT_STATUSES = ["completed", "failed"] as const;
export const EXPORT_PRIVACY_FILTERS = ["draftContent", "users", "apiKeys"] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type ExportStatus = (typeof EXPORT_STATUSES)[number];

export type ExportManifestFile = {
  bytes: number;
  checksum: string;
  path: string;
};

export type ExportManifest = {
  byteCount: number;
  createdAt: string;
  fileCount: number;
  files: ExportManifestFile[];
  format: ExportFormat;
  omittedData: string[];
  privacyFilters: readonly string[];
  schemaVersion: typeof EXPORT_MANIFEST_SCHEMA_VERSION;
  scope: Record<string, unknown>;
  status: ExportStatus;
  warnings: string[];
};

export const exportHardeningContract = {
  formats: EXPORT_FORMATS,
  history: {
    downloadableReports: true,
    fields: ["id", "format", "scope", "status", "manifest", "warnings", "omittedData", "fileCount", "byteCount", "checksum", "createdAt", "completedAt"],
  },
  manifestSchemaVersion: EXPORT_MANIFEST_SCHEMA_VERSION,
  privacyFilters: EXPORT_PRIVACY_FILTERS,
  statuses: EXPORT_STATUSES,
};

export function sha256(value: string | ArrayBuffer | Uint8Array) {
  const hash = createHash("sha256");
  if (typeof value === "string") {
    hash.update(value);
  } else if (value instanceof ArrayBuffer) {
    hash.update(Buffer.from(value));
  } else {
    hash.update(value);
  }
  return hash.digest("hex");
}

export function byteLength(value: string | ArrayBuffer | Uint8Array) {
  if (typeof value === "string") return Buffer.byteLength(value);
  if (value instanceof ArrayBuffer) return value.byteLength;
  return value.byteLength;
}

export function createExportManifest(input: {
  files: { content: string | ArrayBuffer | Uint8Array; path: string }[];
  format: ExportFormat;
  omittedData?: string[];
  scope?: Record<string, unknown>;
  status?: ExportStatus;
  warnings?: string[];
}): ExportManifest {
  const files = input.files.map((file) => ({
    bytes: byteLength(file.content),
    checksum: sha256(file.content),
    path: file.path,
  }));

  return {
    byteCount: files.reduce((sum, file) => sum + file.bytes, 0),
    createdAt: new Date().toISOString(),
    fileCount: files.length,
    files,
    format: input.format,
    omittedData: input.omittedData ?? ["sessions", "apiKeys", "users"],
    privacyFilters: EXPORT_PRIVACY_FILTERS,
    schemaVersion: EXPORT_MANIFEST_SCHEMA_VERSION,
    scope: input.scope ?? { type: "all" },
    status: input.status ?? "completed",
    warnings: input.warnings ?? [],
  };
}

export async function recordExportHistory(manifest: ExportManifest) {
  try {
    return await prisma.exportHistory.create({
      data: {
        byteCount: manifest.byteCount,
        checksum: sha256(JSON.stringify(manifest)),
        completedAt: manifest.status === "completed" ? new Date() : null,
        fileCount: manifest.fileCount,
        format: manifest.format,
        manifest: manifest as unknown as import("@prisma/client").Prisma.InputJsonValue,
        omittedData: manifest.omittedData,
        scope: manifest.scope as import("@prisma/client").Prisma.InputJsonValue,
        status: manifest.status,
        warnings: manifest.warnings,
      },
    });
  } catch {
    return null;
  }
}
