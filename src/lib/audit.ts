import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export type AuditAction =
  | "admin.failed_operation"
  | "api_token.create"
  | "api_token.revoke"
  | "article.create"
  | "article.delete"
  | "article.restore"
  | "article.status_change"
  | "category.create"
  | "category.delete"
  | "collection.create"
  | "collection.update"
  | "collection.delete"
  | "collection.import"
  | "collection.item.create"
  | "collection.item.delete"
  | "collection.view.create"
  | "collection.view.update"
  | "collection.view.delete"
  | "export.create"
  | "kit.apply"
  | "revision.revert"
  | "user.delete"
  | "user.role_change";

export type AuditSeverity = "info" | "warning" | "high" | "critical";
export type AuditActorType = "user" | "api-key" | "system" | "anonymous";
export type AuditRedactionMode = "full" | "summary" | "standard" | "strict" | "redacted";

export const AUDIT_SCHEMA_VERSION = "arkivel.audit-trail.v1";

export type AuditOptions = {
  severity?: AuditSeverity;
  actorType?: AuditActorType;
  ipAddress?: string | null;
  userAgent?: string | null;
  success?: boolean;
  request?: Request;
};

export const auditTrailContract = {
  schemaVersion: AUDIT_SCHEMA_VERSION,
  filters: ["actor", "action", "target", "severity", "date", "success"],
  redaction: {
    redactedKeys: ["password", "token", "secret", "apiKey", "authorization", "cookie", "email", "ipAddress", "userAgent"],
    exportModes: ["full", "summary", "standard", "strict"],
  },
  retention: { standardDays: 365, criticalDays: 2555 },
} as const;

export async function logAudit(
  action: AuditAction,
  entity: { type: string; id?: string; label?: string },
  metadata?: Record<string, unknown>,
  options: AuditOptions = {},
) {
  try {
    const session = await getSession();
    const requestIp = options.request
      ? options.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? options.request.headers.get("x-real-ip")
      : null;

    await prisma.auditLog.create({
      data: {
        userId: session?.id ?? null,
        username: session?.username ?? null,
        action,
        entityType: entity.type,
        entityId: entity.id ?? null,
        entityLabel: entity.label ?? null,
        severity: options.severity ?? defaultAuditSeverity(action),
        actorType: options.actorType ?? (session ? "user" : "system"),
        ipAddress: options.ipAddress ?? requestIp ?? null,
        userAgent: options.userAgent ?? options.request?.headers.get("user-agent") ?? null,
        success: options.success ?? true,
        metadata: metadata ? metadata as import("@prisma/client").Prisma.InputJsonValue : undefined,
      },
    });
  } catch {
    // Audit logging must never break the operation it records.
  }
}

export function defaultAuditSeverity(action: AuditAction): AuditSeverity {
  if (action.includes("delete") || action === "revision.revert" || action === "admin.failed_operation") {
    return "warning";
  }
  if (action === "user.role_change") return "high";
  return "info";
}

export function shouldAlertOnAuditEvent(event: { severity?: string | null; success?: boolean | null }) {
  return event.success === false || event.severity === "critical";
}

export function redactAuditMetadata(value: unknown, mode: AuditRedactionMode = "standard"): unknown {
  if (mode === "full") return value;
  if (Array.isArray(value)) return value.map((item) => redactAuditMetadata(item, mode));
  if (!value || typeof value !== "object") return value;
  if (mode === "summary") return "[metadata redacted]";

  const redacted: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const sensitive = auditTrailContract.redaction.redactedKeys.some((needle) =>
      key.toLowerCase().includes(needle.toLowerCase()),
    );
    redacted[key] = sensitive || mode === "strict"
      ? "[redacted]"
      : redactAuditMetadata(child, mode);
  }
  return redacted;
}

function formatAuditExportEntry<T extends {
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  username?: string | null;
  userId?: string | null;
}>(entry: T, mode: AuditRedactionMode): T {
  if (mode === "full") return entry;
  if (mode === "summary") {
    return {
      ...entry,
      userId: entry.userId ? "[redacted]" : entry.userId,
      username: entry.username ? "[redacted]" : entry.username,
      ipAddress: entry.ipAddress ? "[redacted]" : entry.ipAddress,
      userAgent: entry.userAgent ? "[redacted]" : entry.userAgent,
      metadata: "[metadata redacted]",
    };
  }
  return {
    ...entry,
    ipAddress: entry.ipAddress ? "[redacted]" : entry.ipAddress,
    userAgent: mode === "strict" && entry.userAgent ? "[redacted]" : entry.userAgent,
    username: mode === "strict" && entry.username ? "[redacted]" : entry.username,
    userId: mode === "strict" && entry.userId ? "[redacted]" : entry.userId,
    metadata: redactAuditMetadata(entry.metadata, mode),
  };
}

export function createAuditExport<T extends {
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  username?: string | null;
  userId?: string | null;
}>(logs: T[], options: { redaction?: AuditRedactionMode; exportedAt?: string } = {}) {
  const redaction = options.redaction ?? "standard";
  return {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    redaction,
    count: logs.length,
    logs: logs.map((entry) => formatAuditExportEntry(entry, redaction)),
  };
}
