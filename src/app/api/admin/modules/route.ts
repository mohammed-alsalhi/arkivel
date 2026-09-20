import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { MODULES_SETTING_KEY, getModuleOverride } from "@/modules/enabled";
import { MODULES, normalizeModuleIds, parseModuleIds, parseModuleOverride, resolveEnabledModules } from "@/modules/registry";

export const dynamic = "force-dynamic";

async function state() {
  const env = process.env.ARKIVEL_MODULES?.trim() || null;
  const override = parseModuleOverride(await getModuleOverride());
  return {
    env,
    envDefault: parseModuleIds(env ?? undefined),
    override,
    enabled: resolveEnabledModules(env ?? undefined, override ? { enabled: override } : null),
    modules: MODULES.map(({ id, name, description, routes, defaultEnabled }) => ({
      id,
      name,
      description,
      routes,
      defaultEnabled,
    })),
  };
}

/** GET /api/admin/modules — the registry with the environment default, override, and resolved set */
export async function GET() {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await state());
}

/** PUT /api/admin/modules — store `{ enabled: ModuleId[] }` as the admin override */
export async function PUT(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const requested = body && typeof body === "object" ? (body as { enabled?: unknown }).enabled : undefined;
  if (!Array.isArray(requested)) {
    return NextResponse.json({ error: "enabled must be an array of module ids" }, { status: 400 });
  }
  const enabled = normalizeModuleIds(requested);
  await prisma.systemSetting.upsert({
    where: { id: MODULES_SETTING_KEY },
    update: { enabled: true, config: { enabled } },
    create: { id: MODULES_SETTING_KEY, enabled: true, config: { enabled } },
  });
  return NextResponse.json(await state());
}

/** DELETE /api/admin/modules — drop the override and return to the environment default */
export async function DELETE() {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.systemSetting.deleteMany({ where: { id: MODULES_SETTING_KEY } });
  return NextResponse.json(await state());
}
