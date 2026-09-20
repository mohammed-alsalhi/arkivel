import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    systemSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as maintenanceRoute from "../maintenance/route";
import * as readOnlyRoute from "../read-only/route";

describe("maintenance and read-only admin APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAdmin).mockResolvedValue(true);
  });

  it("returns maintenance mode state for admins", async () => {
    vi.mocked(prisma.systemSetting.findUnique).mockResolvedValue({ enabled: true } as never);

    const response = await maintenanceRoute.GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.enabled).toBe(true);
    expect(prisma.systemSetting.findUnique).toHaveBeenCalledWith({
      where: { id: "maintenance_mode" },
    });
  });

  it("blocks maintenance mode state for non-admins", async () => {
    vi.mocked(isAdmin).mockResolvedValue(false);

    const response = await maintenanceRoute.GET();
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Forbidden");
  });

  it("normalizes read-only updates before persistence", async () => {
    vi.mocked(prisma.systemSetting.upsert).mockResolvedValue({ enabled: true } as never);
    const request = new NextRequest("http://localhost/api/admin/read-only", {
      body: JSON.stringify({ enabled: "on" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await readOnlyRoute.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.enabled).toBe(true);
    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ id: "read_only_mode", enabled: true }),
      update: expect.objectContaining({ enabled: true }),
      where: { id: "read_only_mode" },
    }));
  });
});
