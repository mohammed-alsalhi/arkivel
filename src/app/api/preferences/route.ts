import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DEFAULT_PREFERENCES, mergePreferences } from "@/lib/preferences";
import { isWikiSkin } from "@/lib/skin";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const pref = await prisma.userPreference.findUnique({
      where: { userId: session.id },
    });

    if (!pref) {
      return NextResponse.json(DEFAULT_PREFERENCES);
    }

    // pref.data is a JSON column storing partial preferences
    const saved =
      typeof pref.data === "object" && pref.data !== null
        ? (pref.data as Record<string, unknown>)
        : {};

    return NextResponse.json(mergePreferences(saved));
  } catch (error) {
    console.error("Failed to fetch preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Validate known keys only — strip anything unexpected
    const allowedKeys = new Set(Object.keys(DEFAULT_PREFERENCES));
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!allowedKeys.has(key)) continue;
      if (key === "skin") {
        // "" follows the site default; anything else must be a known skin
        if (value === "" || isWikiSkin(value)) sanitized.skin = value;
        continue;
      }
      sanitized[key] = value;
    }

    // Fetch existing preferences to merge with update
    const existing = await prisma.userPreference.findUnique({
      where: { userId: session.id },
    });

    const currentData =
      existing && typeof existing.data === "object" && existing.data !== null
        ? (existing.data as Record<string, unknown>)
        : {};

    const merged = { ...currentData, ...sanitized };

    await prisma.userPreference.upsert({
      where: { userId: session.id },
      create: {
        userId: session.id,
        data: merged as Prisma.InputJsonValue,
      },
      update: {
        data: merged as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(mergePreferences(merged));
  } catch (error) {
    console.error("Failed to update preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
