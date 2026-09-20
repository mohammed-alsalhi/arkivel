import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin, requireAdmin } from "@/lib/auth";
import { generateSlug } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();
  const { name, description, coverImage, parentId } = body;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = trimmed;
    data.slug = generateSlug(trimmed);

    // Check slug uniqueness (excluding self)
    const conflict = await prisma.category.findFirst({
      where: { slug: data.slug as string, id: { not: id } },
    });
    if (conflict) {
      return NextResponse.json({ error: "A category with that name already exists" }, { status: 409 });
    }
  }

  if (description !== undefined) data.description = description || null;
  if (coverImage !== undefined) data.coverImage = coverImage || null;
  if (parentId !== undefined) {
    // Prevent setting self as parent
    if (parentId === id) {
      return NextResponse.json({ error: "Category cannot be its own parent" }, { status: 400 });
    }
    data.parentId = parentId || null;
  }

  const updated = await prisma.category.update({
    where: { id },
    data,
    include: { parent: true, _count: { select: { articles: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { id } = await params;

  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { articles: true, children: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Prevent deleting categories with articles
  if (existing._count.articles > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${existing._count.articles} article(s) use this category. Reassign them first.` },
      { status: 409 }
    );
  }

  // Prevent deleting categories with children
  if (existing._count.children > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${existing._count.children} subcategory(ies) exist under this category. Delete or move them first.` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });
  await logAudit("category.delete", { type: "category", id, label: existing.name });
  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
