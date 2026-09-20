import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import { isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST — generate a share token for a draft article
export async function POST(_req: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("share");
  if (disabled) return disabled;

  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const token = randomBytes(24).toString("hex");

  const article = await prisma.article.update({
    where: { id },
    data: { shareToken: token },
    select: { shareToken: true },
  });

  return NextResponse.json({ token: article.shareToken });
}

// DELETE — revoke the share token
export async function DELETE(_req: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("share");
  if (disabled) return disabled;

  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.article.update({ where: { id }, data: { shareToken: null } });

  return NextResponse.json({ ok: true });
}
