import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  default: {
    userPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { GET, PUT } from "@/app/api/preferences/route";

const sessionUser = {
  id: "user-1",
  username: "reader",
  email: "reader@example.com",
  displayName: null,
  role: "editor",
};

function putRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

function upsertedData(): Record<string, unknown> {
  const call = vi.mocked(prisma.userPreference.upsert).mock.calls[0]?.[0];
  return call?.update.data as Record<string, unknown>;
}

describe("preferences API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue(sessionUser);
    vi.mocked(prisma.userPreference.upsert).mockResolvedValue({} as never);
  });

  it("requires a session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    expect((await GET()).status).toBe(401);
    expect((await PUT(putRequest({ skin: "wiki" }))).status).toBe(401);
    expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
  });

  it("stores a valid skin alongside existing preferences", async () => {
    vi.mocked(prisma.userPreference.findUnique).mockResolvedValue({
      data: { editorMode: "markdown" },
    } as never);

    const res = await PUT(putRequest({ skin: "wiki" }));

    expect(res.status).toBe(200);
    expect(upsertedData()).toEqual({ editorMode: "markdown", skin: "wiki" });
    expect((await res.json()).skin).toBe("wiki");
  });

  it("accepts an empty skin to follow the site default again", async () => {
    vi.mocked(prisma.userPreference.findUnique).mockResolvedValue({
      data: { skin: "wiki" },
    } as never);

    const res = await PUT(putRequest({ skin: "" }));

    expect(upsertedData().skin).toBe("");
    expect((await res.json()).skin).toBe("");
  });

  it("strips unknown skins and unknown keys", async () => {
    vi.mocked(prisma.userPreference.findUnique).mockResolvedValue({
      data: { skin: "wiki" },
    } as never);

    const res = await PUT(putRequest({ skin: "neon", bogus: true, locale: "fr" }));

    expect(upsertedData()).toEqual({ skin: "wiki", locale: "fr" });
    expect((await res.json()).skin).toBe("wiki");
  });

  it("returns the site default for an unknown stored skin", async () => {
    vi.mocked(prisma.userPreference.findUnique).mockResolvedValue({
      data: { skin: "neon" },
    } as never);

    const body = await (await GET()).json();

    expect(body.skin).toBe("");
  });
});
