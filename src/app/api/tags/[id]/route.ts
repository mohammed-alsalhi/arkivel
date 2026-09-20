import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { isAdmin, requireAdmin } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { id } = await params;
  const { name, color, parentId } = await request.json();

  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  // Prevent circular parentage
  if (parentId === id) {
    return NextResponse.json({ error: "Tag cannot be its own parent" }, { status: 400 });
  }

  if (parentId) {
    const parentTag = await prisma.tag.findUnique({ where: { id: parentId } });
    if (!parentTag) {
      return NextResponse.json({ error: "Parent tag not found" }, { status: 400 });
    }
  }

  const slug = name ? generateSlug(name) : undefined;

  // Check slug uniqueness if name changed
  if (slug && slug !== existing.slug) {
    const conflict = await prisma.tag.findFirst({
      where: { slug, NOT: { id } },
    });
    if (conflict) {
      return NextResponse.json({ error: "A tag with that name already exists" }, { status: 409 });
    }
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      ...(name !== undefined && { name, slug }),
      ...(color !== undefined && { color: color || null }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    },
  });

  return NextResponse.json(tag);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { id } = await params;

  // Check if tag has children
  const children = await prisma.tag.findMany({ where: { parentId: id } });
  if (children.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete tag with child tags. Remove or reassign children first." },
      { status: 400 }
    );
  }

  // Delete article-tag associations first, then the tag
  await prisma.articleTag.deleteMany({ where: { tagId: id } });
  await prisma.tag.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
