import { describe, expect, it } from "vitest";
import {
  BACKGROUND_TASKS_PAUSED_KEY,
  createCleanupTasks,
  createMaintenanceChecks,
  createMaintenanceReport,
  maintenanceToolingContract,
  parseModeEnabled,
} from "../maintenance-tooling";

describe("maintenance tooling", () => {
  it("normalizes mode toggles", () => {
    expect(parseModeEnabled(true)).toBe(true);
    expect(parseModeEnabled("on")).toBe(true);
    expect(parseModeEnabled("false")).toBe(false);
  });

  it("creates upgrade readiness checks", () => {
    const checks = createMaintenanceChecks({
      backgroundTasksPaused: false,
      databaseHealthy: true,
      failedJobs: 1,
      hasRecentBackup: false,
      maintenance: false,
      readOnly: true,
    });

    expect(checks.find((check) => check.id === "backup-reminder")?.severity).toBe("warning");
    expect(checks.find((check) => check.id === "write-traffic-paused")?.severity).toBe("pass");
    expect(checks.find((check) => check.id === "migration-readiness")?.severity).toBe("warning");
  });

  it("publishes cleanup tasks and report metadata", () => {
    const cleanupTasks = createCleanupTasks({
      failedJobs: 1,
      orphanedAssets: 2,
      staleSessions: 3,
    });
    const report = createMaintenanceReport({
      backgroundTasksPaused: true,
      checks: [],
      cleanupTasks,
      generatedAt: "2026-05-25T12:00:00.000Z",
      maintenance: true,
      readOnly: false,
    });

    expect(cleanupTasks.map((task) => task.id)).toContain("orphaned-assets");
    expect(cleanupTasks.map((task) => task.id)).toEqual([
      "stale-sessions",
      "orphaned-assets",
      "failed-jobs",
    ]);
    expect(report.schemaVersion).toBe(maintenanceToolingContract.schemaVersion);
    expect(maintenanceToolingContract.modeKeys.backgroundTasksPaused).toBe(BACKGROUND_TASKS_PAUSED_KEY);
  });
});
