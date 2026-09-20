import { isPrivateInstance } from "@/lib/instance-access";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { config } from "@/lib/config";

export async function GET() {
  const startTime = process.uptime();
  let dbConnected = false;
  let articleCount = 0;

  try {
    if (isPrivateInstance()) await prisma.$queryRaw`SELECT 1`;
    else articleCount = await prisma.article.count({ where: { published: true, status: "published" } });
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  return NextResponse.json({
    status: dbConnected ? "ok" : "degraded",
    uptime: Math.floor(startTime),
    dbConnected,
    version: config.version,
    ...(isPrivateInstance() ? {} : { articleCount }),
    timestamp: new Date().toISOString(),
  });
}

export const dynamic = "force-dynamic";
