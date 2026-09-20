import { NextRequest, NextResponse } from "next/server";
import { isAdmin, requireAdmin } from "@/lib/auth";
import {
  BACKGROUND_TASKS_PAUSED_KEY,
  MAINTENANCE_MODE_KEY,
  READ_ONLY_MODE_KEY,
  createCleanupTasks,
  createMaintenanceChecks,
  createMaintenanceReport,
} from "@/lib/maintenance-tooling";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const report = await buildReport();
  return NextResponse.json(report);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task : "";
  const dryRun = body.dryRun !== false;

  if (task === "background-tasks-paused") {
    const enabled = Boolean(body.enabled);
    const record = await prisma.systemSetting.upsert({
      where: { id: BACKGROUND_TASKS_PAUSED_KEY },
      update: { enabled },
      create: { id: BACKGROUND_TASKS_PAUSED_KEY, enabled },
    });
    return NextResponse.json({ dryRun: false, enabled: record.enabled, task });
  }

  const result = await runCleanupTask(task, dryRun);
  if (!result) {
    return NextResponse.json({ error: "Unknown maintenance task" }, { status: 400 });
  }

  return NextResponse.json(result);
}

async function buildReport() {
  const old = new Date(Date.now() - THIRTY_DAYS_MS);
  let databaseHealthy = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseHealthy = false;
  }

  const [
    modeStates,
    staleSessions,
    failedJobs,
    latestCompletedExport,
    orphanedAssets,
  ] = await Promise.all([
    prisma.systemSetting.findMany({
      where: { id: { in: [MAINTENANCE_MODE_KEY, READ_ONLY_MODE_KEY, BACKGROUND_TASKS_PAUSED_KEY] } },
    }).catch(() => []),
    prisma.session.count({ where: { expiresAt: { lt: new Date() } } }).catch(() => 0),
    prisma.exportHistory.count({ where: { status: { not: "completed" }, createdAt: { lt: old } } }).catch(() => 0),
    prisma.exportHistory.findFirst({ where: { status: "completed" }, orderBy: { completedAt: "desc" } }).catch(() => null),
    countOrphanedAssets(),
  ]);

  const modeMap = new Map(modeStates.map((state) => [state.id, state.enabled]));
  const maintenance = modeMap.get(MAINTENANCE_MODE_KEY) ?? false;
  const readOnly = modeMap.get(READ_ONLY_MODE_KEY) ?? false;
  const backgroundTasksPaused = modeMap.get(BACKGROUND_TASKS_PAUSED_KEY) ?? false;
  const cleanupTasks = createCleanupTasks({
    failedJobs,
    orphanedAssets,
    staleSessions,
  });
  const checks = createMaintenanceChecks({
    backgroundTasksPaused,
    databaseHealthy,
    failedJobs,
    hasRecentBackup: Boolean(latestCompletedExport),
    maintenance,
    readOnly,
  });

  return createMaintenanceReport({
    backgroundTasksPaused,
    checks,
    cleanupTasks,
    maintenance,
    readOnly,
  });
}

async function runCleanupTask(task: string, dryRun: boolean) {
  const old = new Date(Date.now() - THIRTY_DAYS_MS);

  if (task === "stale-sessions") {
    const count = await prisma.session.count({ where: { expiresAt: { lt: new Date() } } });
    if (dryRun) return { count, dryRun, task };
    const result = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return { count: result.count, dryRun, task };
  }

  if (task === "failed-jobs") {
    const where = { status: { not: "completed" }, createdAt: { lt: old } };
    const count = await prisma.exportHistory.count({ where });
    if (dryRun) return { count, dryRun, task };
    const result = await prisma.exportHistory.deleteMany({ where });
    return { count: result.count, dryRun, task };
  }

  if (task === "orphaned-assets") {
    const ids = await findOrphanedAssetIds();
    if (dryRun) return { count: ids.length, dryRun, task };
    const result = ids.length > 0
      ? await prisma.asset.deleteMany({ where: { id: { in: ids } } })
      : { count: 0 };
    return { count: result.count, dryRun, task };
  }

  return null;
}

async function countOrphanedAssets() {
  return (await findOrphanedAssetIds()).length;
}

async function findOrphanedAssetIds() {
  const assets = await prisma.asset.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, url: true },
    take: 250,
  }).catch(() => []);
  const ids: string[] = [];

  for (const asset of assets) {
    const [articleReferences, categoryReferences] = await Promise.all([
      prisma.article.count({
        where: {
          OR: [
            { content: { contains: asset.url } },
            { contentRaw: { contains: asset.url } },
            { coverImage: asset.url },
          ],
        },
      }).catch(() => 0),
      prisma.category.count({ where: { coverImage: asset.url } }).catch(() => 0),
    ]);
    if (articleReferences + categoryReferences === 0) ids.push(asset.id);
  }

  return ids;
}
