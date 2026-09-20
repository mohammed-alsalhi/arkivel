import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { createAuditExport, logAudit, type AuditRedactionMode } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    await logAudit(
      "admin.failed_operation",
      { type: "audit-log", label: "Unauthorized audit log access" },
      { route: "/api/admin/audit-log", method: "GET" },
      { severity: "warning", success: false, request }
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const where = buildAuditWhere(searchParams);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 50;
  const download = searchParams.get("download") === "1";

  if (download) {
    const redaction = normalizeRedaction(searchParams.get("redaction"));
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const payload = createAuditExport(logs, { redaction });
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="arkivel-audit-log-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
}

export const dynamic = "force-dynamic";

function buildAuditWhere(searchParams: URLSearchParams): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  const action = searchParams.get("action");
  const actor = searchParams.get("actor");
  const target = searchParams.get("target");
  const severity = searchParams.get("severity");
  const success = searchParams.get("success");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (action) where.action = action;
  if (severity) where.severity = severity;
  if (success === "true" || success === "false") where.success = success === "true";

  if (actor) {
    where.OR = [
      { userId: actor },
      { username: { contains: actor, mode: "insensitive" } },
      { actorType: actor },
    ];
  }

  if (target) {
    const targetFilter: Prisma.AuditLogWhereInput = {
      OR: [
        { entityType: { contains: target, mode: "insensitive" } },
        { entityId: target },
        { entityLabel: { contains: target, mode: "insensitive" } },
      ],
    };
    where.AND = [...toArray(where.AND), targetFilter];
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  return where;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeRedaction(value: string | null): AuditRedactionMode {
  if (value === "full" || value === "summary" || value === "strict" || value === "redacted") return value;
  return "standard";
}
