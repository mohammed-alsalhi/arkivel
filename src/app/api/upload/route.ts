import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import crypto from "crypto";
import path from "path";
import { isAdmin, requireAdmin } from "@/lib/auth";
import { getStorage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const disabled = await moduleDisabledResponse("assets");
  if (disabled) return disabled;

  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = path.extname(file.name) || ".png";
  const filename = `uploads/${crypto.randomUUID()}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorage();
  const { url } = await storage.upload(buffer, filename, file.type);

  return NextResponse.json({ url });
}
