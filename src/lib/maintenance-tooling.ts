import packageJson from "../../package.json";

export const MAINTENANCE_TOOLING_SCHEMA_VERSION = "1.0.0";

export const MAINTENANCE_MODE_KEY = "maintenance_mode";
export const READ_ONLY_MODE_KEY = "read_only_mode";
export const BACKGROUND_TASKS_PAUSED_KEY = "background_tasks_paused";

export type MaintenanceSeverity = "pass" | "info" | "warning" | "critical";

export type MaintenanceCheck = {
  detail: string;
  id: string;
  label: string;
  severity: MaintenanceSeverity;
};

export type CleanupTask = {
  count: number;
  description: string;
  id: string;
  label: string;
  route: string;
  safeToRun: boolean;
};

export type MaintenanceRunbook = {
  href: string;
  id: string;
  label: string;
};

export type MaintenanceReport = {
  checks: MaintenanceCheck[];
  cleanupTasks: CleanupTask[];
  generatedAt: string;
  modes: {
    backgroundTasksPaused: boolean;
    maintenance: boolean;
    readOnly: boolean;
  };
  runbooks: MaintenanceRunbook[];
  schemaVersion: string;
  version: string;
};

export const maintenanceToolingContract = {
  schemaVersion: MAINTENANCE_TOOLING_SCHEMA_VERSION,
  routes: {
    maintenance: "/admin/maintenance",
    readOnly: "/admin/read-only",
    report: "/api/admin/maintenance/report",
  },
  modeKeys: {
    backgroundTasksPaused: BACKGROUND_TASKS_PAUSED_KEY,
    maintenance: MAINTENANCE_MODE_KEY,
    readOnly: READ_ONLY_MODE_KEY,
  },
  cleanupTasks: [
    "stale-sessions",
    "orphaned-assets",
    "failed-jobs",
  ],
  safeUpgradeChecks: [
    "database-health",
    "backup-reminder",
    "migration-readiness",
    "write-traffic-paused",
    "background-tasks-paused",
  ],
} as const;

export const maintenanceRunbooks: MaintenanceRunbook[] = [
  { href: "/admin/maintenance", id: "maintenance-mode", label: "Maintenance mode" },
  { href: "/admin/read-only", id: "read-only-mode", label: "Read-only mode" },
  { href: "/api/export/history", id: "backup-history", label: "Export history" },
  { href: "/docs", id: "production-runbook", label: "Deployment guide" },
];

export function parseModeEnabled(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1" || value === "on";
  return false;
}

export function createCleanupTasks(counts: {
  failedJobs: number;
  orphanedAssets: number;
  staleSessions: number;
}): CleanupTask[] {
  return [
    {
      count: counts.staleSessions,
      description: "Expired session rows that can be removed before or after an upgrade.",
      id: "stale-sessions",
      label: "Stale sessions",
      route: "/api/admin/maintenance/report",
      safeToRun: true,
    },
    {
      count: counts.orphanedAssets,
      description: "Asset library rows not referenced by article or category content.",
      id: "orphaned-assets",
      label: "Orphaned assets",
      route: "/api/admin/maintenance/report",
      safeToRun: counts.orphanedAssets > 0,
    },
    {
      count: counts.failedJobs,
      description: "Old failed export records that no longer need to stay in the active queue view.",
      id: "failed-jobs",
      label: "Failed jobs",
      route: "/api/admin/maintenance/report",
      safeToRun: true,
    },
  ];
}

export function createMaintenanceChecks(input: {
  backgroundTasksPaused: boolean;
  databaseHealthy: boolean;
  failedJobs: number;
  hasRecentBackup: boolean;
  maintenance: boolean;
  readOnly: boolean;
}): MaintenanceCheck[] {
  return [
    {
      detail: input.databaseHealthy ? "Database health check succeeded." : "Database health check failed.",
      id: "database-health",
      label: "Database health",
      severity: input.databaseHealthy ? "pass" : "critical",
    },
    {
      detail: input.hasRecentBackup ? "A completed export exists for backup review." : "Run a full export before upgrading.",
      id: "backup-reminder",
      label: "Backup reminder",
      severity: input.hasRecentBackup ? "pass" : "warning",
    },
    {
      detail: input.failedJobs === 0
        ? "No failed exports need attention."
        : "Resolve failed exports before upgrading.",
      id: "migration-readiness",
      label: "Migration readiness",
      severity: input.failedJobs === 0 ? "pass" : "warning",
    },
    {
      detail: input.maintenance || input.readOnly
        ? "Write traffic is intentionally constrained."
        : "Enable maintenance or read-only mode for safer upgrades.",
      id: "write-traffic-paused",
      label: "Write traffic",
      severity: input.maintenance || input.readOnly ? "pass" : "info",
    },
    {
      detail: input.backgroundTasksPaused
        ? "Background tasks are paused."
        : "Pause background tasks during high-risk maintenance windows.",
      id: "background-tasks-paused",
      label: "Background tasks",
      severity: input.backgroundTasksPaused ? "pass" : "info",
    },
  ];
}

export function createMaintenanceReport(input: {
  backgroundTasksPaused: boolean;
  checks: MaintenanceCheck[];
  cleanupTasks: CleanupTask[];
  generatedAt?: string;
  maintenance: boolean;
  readOnly: boolean;
}): MaintenanceReport {
  return {
    checks: input.checks,
    cleanupTasks: input.cleanupTasks,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    modes: {
      backgroundTasksPaused: input.backgroundTasksPaused,
      maintenance: input.maintenance,
      readOnly: input.readOnly,
    },
    runbooks: maintenanceRunbooks,
    schemaVersion: MAINTENANCE_TOOLING_SCHEMA_VERSION,
    version: packageJson.version,
  };
}
