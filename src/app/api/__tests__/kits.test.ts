import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    collection: { findMany: vi.fn() },
  },
}));

vi.mock("@/modules/enabled", () => ({
  MODULES_SETTING_KEY: "modules",
  getEnabledModules: vi.fn(),
}));

vi.mock("@/kits/apply", async () => {
  const actual = await vi.importActual<typeof import("@/kits/apply")>("@/kits/apply");
  return { ...actual, applyKit: vi.fn() };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import prisma from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { applyKit, KitError } from "@/kits/apply";
import { getEnabledModules } from "@/modules/enabled";
import { GET } from "@/app/api/admin/kits/route";
import { POST } from "@/app/api/admin/kits/apply/route";

function request(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const viewer = { id: "u2", username: "v", email: "v@example.com", displayName: null, role: "viewer" };

describe("starter kit admin API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getSession).mockResolvedValue(null);
    vi.mocked(getEnabledModules).mockResolvedValue(["collections", "graph"]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([{ slug: "tasks" }] as never);
  });

  describe("GET /api/admin/kits", () => {
    it("401s anonymous callers", async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);
      const res = await GET();
      expect(res.status).toBe(401);
      expect(prisma.collection.findMany).not.toHaveBeenCalled();
    });

    it("403s signed-in non-admins", async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);
      vi.mocked(getSession).mockResolvedValue(viewer);
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("reports each kit's status from the enabled modules and existing collections", async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.enabled).toEqual(["collections", "graph"]);
      expect(prisma.collection.findMany).toHaveBeenCalledWith({
        where: { slug: { in: ["tasks", "reading-list", "tasks", "courses", "coursework", "watchlist", "episodes"] } },
        select: { slug: true },
      });

      const byId = Object.fromEntries(body.kits.map((kit: { id: string }) => [kit.id, kit]));
      expect(byId["notes-and-tasks"]).toMatchObject({
        status: "partial",
        modulesEnabled: ["collections", "graph"],
        collections: [
          expect.objectContaining({ slug: "tasks", exists: true }),
          expect.objectContaining({ slug: "reading-list", exists: false }),
        ],
      });
      expect(byId.wiki).toMatchObject({ status: "partial", modulesEnabled: ["graph"], collections: [] });
      expect(byId["team-knowledge-base"].status).toBe("partial");
    });

    it("marks a kit applied once everything it needs is in place", async () => {
      vi.mocked(getEnabledModules).mockResolvedValue(["graph", "api", "feeds", "share"]);
      vi.mocked(prisma.collection.findMany).mockResolvedValue([] as never);
      const body = await (await GET()).json();
      const byId = Object.fromEntries(body.kits.map((kit: { id: string }) => [kit.id, kit]));
      expect(byId.wiki.status).toBe("applied");
      expect(byId["notes-and-tasks"].status).toBe("partial");
    });

    it("treats a failed collection lookup as no collections", async () => {
      vi.mocked(prisma.collection.findMany).mockRejectedValue(new Error("no database"));
      const body = await (await GET()).json();
      const kit = body.kits.find((entry: { id: string }) => entry.id === "notes-and-tasks");
      expect(kit.collections.every((collection: { exists: boolean }) => !collection.exists)).toBe(true);
    });
  });

  describe("POST /api/admin/kits/apply", () => {
    it("401s anonymous callers", async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);
      const res = await POST(request({ kit: "wiki" }));
      expect(res.status).toBe(401);
      expect(applyKit).not.toHaveBeenCalled();
    });

    it("403s signed-in non-admins", async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);
      vi.mocked(getSession).mockResolvedValue(viewer);
      const res = await POST(request({ kit: "wiki" }));
      expect(res.status).toBe(403);
      expect(applyKit).not.toHaveBeenCalled();
    });

    it("400s an unknown kit", async () => {
      const res = await POST(request({ kit: "crm" }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "unknown kit", fields: { kit: "unknown kit" } });
      expect(applyKit).not.toHaveBeenCalled();
    });

    it("applies the kit with sample items by default and returns the report", async () => {
      const report = {
        kit: "notes-and-tasks",
        skin: "folio",
        modulesEnabled: ["collections", "graph"],
        collectionsCreated: ["tasks", "reading-list"],
        collectionsSkipped: [],
        itemsCreated: 6,
      };
      vi.mocked(applyKit).mockResolvedValue(report as never);

      const res = await POST(request({ kit: "notes-and-tasks" }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(report);
      expect(applyKit).toHaveBeenCalledWith("notes-and-tasks", { seedSampleItems: true });
    });

    it("passes seedSampleItems: false through", async () => {
      vi.mocked(applyKit).mockResolvedValue({} as never);
      await POST(request({ kit: "wiki", seedSampleItems: false }));
      expect(applyKit).toHaveBeenCalledWith("wiki", { seedSampleItems: false });
    });

    it("turns a kit error into a 400", async () => {
      vi.mocked(applyKit).mockRejectedValue(new KitError("unknown template \"x\""));
      const res = await POST(request({ kit: "wiki" }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/unknown template/);
    });
  });
});
