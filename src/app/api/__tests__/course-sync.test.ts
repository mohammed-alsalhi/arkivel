import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/modules/enabled", () => ({ moduleDisabledResponse: vi.fn(async () => null) }));
vi.mock("@/modules/collections/access", () => ({ requireCollectionEditor: vi.fn(async () => null) }));
vi.mock("@/modules/collections/queries", () => ({ resolveCollection: vi.fn(async () => ({ id: "work" })) }));
vi.mock("@/modules/collections/course-sync-import", () => ({ importCourseSync: vi.fn(async () => ({ dryRun: true, created: 1 })) }));

import { moduleDisabledResponse } from "@/modules/enabled";
import { requireCollectionEditor } from "@/modules/collections/access";
import { importCourseSync } from "@/modules/collections/course-sync-import";
import { CourseSyncError } from "@/modules/collections/course-sync";
import { POST } from "@/app/api/collections/[id]/import-course-sync/route";

const request = (body: unknown) => new NextRequest("http://localhost/api/collections/work/import-course-sync", { method: "POST", body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id: "work" }) };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(moduleDisabledResponse).mockResolvedValue(null);
  vi.mocked(requireCollectionEditor).mockResolvedValue(null);
  vi.mocked(importCourseSync).mockResolvedValue({ dryRun: true, created: 1 } as never);
});

describe("course-sync API boundary", () => {
  it("previews by default and requires explicit false to apply", async () => {
    expect((await POST(request({ source: {} }), params)).status).toBe(200);
    expect(importCourseSync).toHaveBeenLastCalledWith("work", {}, true);
    await POST(request({ source: {}, dryRun: false }), params);
    expect(importCourseSync).toHaveBeenLastCalledWith("work", {}, false);
    expect((await POST(request({ source: {}, dryRun: "false" }), params)).status).toBe(400);
  });

  it("checks module availability and editor permission before importing", async () => {
    vi.mocked(moduleDisabledResponse).mockResolvedValue(NextResponse.json({}, { status: 404 }));
    expect((await POST(request({}), params)).status).toBe(404);
    vi.mocked(moduleDisabledResponse).mockResolvedValue(null);
    vi.mocked(requireCollectionEditor).mockResolvedValue(NextResponse.json({}, { status: 403 }));
    expect((await POST(request({}), params)).status).toBe(403);
    expect(importCourseSync).not.toHaveBeenCalled();
  });

  it("rejects malformed or oversized input and returns validation errors", async () => {
    expect((await POST(request([]), params)).status).toBe(400);
    expect((await POST(request({ source: "x".repeat(2_100_001) }), params)).status).toBe(413);
    expect(importCourseSync).not.toHaveBeenCalled();
    vi.mocked(importCourseSync).mockRejectedValue(new CourseSyncError("invalid source"));
    const response = await POST(request({ source: {} }), params);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid source" });
  });
});
