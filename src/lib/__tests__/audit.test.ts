import { describe, expect, it } from "vitest";
import {
  AUDIT_SCHEMA_VERSION,
  auditTrailContract,
  createAuditExport,
  defaultAuditSeverity,
  redactAuditMetadata,
  shouldAlertOnAuditEvent,
} from "../audit";

describe("audit trail", () => {
  it("publishes the compact audit trail contract", () => {
    expect(auditTrailContract.schemaVersion).toBe(AUDIT_SCHEMA_VERSION);
    expect(auditTrailContract.filters).toEqual(["actor", "action", "target", "severity", "date", "success"]);
    expect(auditTrailContract.redaction.exportModes).toEqual(expect.arrayContaining(["summary", "standard", "strict"]));
    expect(auditTrailContract.retention.standardDays).toBeGreaterThan(0);
  });

  it("assigns stronger severities to sensitive actions", () => {
    expect(defaultAuditSeverity("user.role_change")).toBe("high");
    expect(defaultAuditSeverity("article.delete")).toBe("warning");
    expect(defaultAuditSeverity("article.create")).toBe("info");
  });

  it("redacts nested sensitive metadata", () => {
    expect(redactAuditMetadata({
      title: "Export",
      actorEmail: "admin@example.com",
      nested: { apiKey: "secret-key", kept: "visible" },
    })).toEqual({
      title: "Export",
      actorEmail: "[redacted]",
      nested: { apiKey: "[redacted]", kept: "visible" },
    });
  });

  it("formats privacy-preserving audit exports", () => {
    const exported = createAuditExport([
      {
        id: "log_1",
        userId: "user_1",
        username: "admin",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        metadata: { token: "secret", note: "keep" },
      },
    ], { redaction: "strict", exportedAt: "2026-05-25T00:00:00.000Z" });

    expect(exported).toMatchObject({
      schemaVersion: AUDIT_SCHEMA_VERSION,
      exportedAt: "2026-05-25T00:00:00.000Z",
      redaction: "strict",
      count: 1,
    });
    expect(exported.logs[0]).toMatchObject({
      userId: "[redacted]",
      username: "[redacted]",
      ipAddress: "[redacted]",
      userAgent: "[redacted]",
      metadata: { token: "[redacted]", note: "[redacted]" },
    });
  });

  it("flags failed and critical events for alert hooks", () => {
    expect(shouldAlertOnAuditEvent({ success: false, severity: "warning" })).toBe(true);
    expect(shouldAlertOnAuditEvent({ success: true, severity: "critical" })).toBe(true);
    expect(shouldAlertOnAuditEvent({ success: true, severity: "info" })).toBe(false);
  });
});
