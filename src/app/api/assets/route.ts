import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import crypto from "crypto";
import path from "path";
import prisma from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const disabled = await moduleDisabledResponse("assets");
  if (disabled) return disabled;

  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });
  const admin = await isAdmin();
  const url = new URL(req.url);
  const mimeFilter = url.searchParams.get("mime");
  const limit = Math.min(200, parseInt(url.searchParams.get("limit") ?? "50"));

  const assets = await prisma.asset.findMany({
    where: {
      userId: admin ? undefined : session.id,
      ...(mimeFilter ? { mimeType: { startsWith: mimeFilter } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, filename: true, mimeType: true, url: true, size: true, createdAt: true },
  });
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const disabled = await moduleDisabledResponse("assets");
  if (disabled) return disabled;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = path.extname(file.name) || "";
  const filename = `assets/${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const storage = getStorage();
  const { url } = await storage.upload(buffer, filename, file.type);

  const asset = await prisma.asset.create({
    data: {
      filename: file.name,
      mimeType: file.type,
      url,
      size: buffer.length,
      userId: session.id,
    },
    select: { id: true, filename: true, mimeType: true, url: true, size: true, createdAt: true },
  });

  return NextResponse.json(asset, { status: 201 });
}
