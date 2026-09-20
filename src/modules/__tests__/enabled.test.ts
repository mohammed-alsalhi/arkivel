import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    systemSetting: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";
import { getEnabledModules, isModuleEnabled, moduleDisabledResponse, requireModule } from "../enabled";

const findUnique = vi.mocked(prisma.systemSetting.findUnique);
const previousEnv = process.env.ARKIVEL_MODULES;

describe("enabled modules (server)", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findUnique.mockResolvedValue(null);
    delete process.env.ARKIVEL_MODULES;
  });

  afterEach(() => {
    if (previousEnv === undefined) delete process.env.ARKIVEL_MODULES;
    else process.env.ARKIVEL_MODULES = previousEnv;
  });

  it("uses every module's default when the environment and the override are both absent", async () => {
    expect(await getEnabledModules()).toEqual(["collections", "graph", "assets", "import", "export", "api", "feeds", "share"]);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "modules" }, select: { config: true } });
  });

  it("reads ARKIVEL_MODULES when there is no override", async () => {
    process.env.ARKIVEL_MODULES = "graph,api,unknown";
    expect(await getEnabledModules()).toEqual(["graph", "api"]);
  });

  it("lets the modules system setting override the environment", async () => {
    process.env.ARKIVEL_MODULES = "graph,api";
    findUnique.mockResolvedValue({ config: { enabled: ["feeds", "bogus"] } } as never);
    expect(await getEnabledModules()).toEqual(["feeds"]);
    expect(await isModuleEnabled("feeds")).toBe(true);
    expect(await isModuleEnabled("graph")).toBe(false);
  });

  it("falls back to the environment when the database is unreachable", async () => {
    process.env.ARKIVEL_MODULES = "share";
    findUnique.mockRejectedValue(new Error("no database"));
    expect(await getEnabledModules()).toEqual(["share"]);
  });

  it("gates pages with notFound and route handlers with a 404 json response", async () => {
    process.env.ARKIVEL_MODULES = "graph";

    expect((await requireModule("graph")).id).toBe("graph");
    await expect(requireModule("assets")).rejects.toThrow();

    expect(await moduleDisabledResponse("graph")).toBeNull();
    const response = await moduleDisabledResponse("assets");
    expect(response?.status).toBe(404);
    expect(await response?.json()).toEqual({ error: "Not Found", module: "assets" });
  });
});
