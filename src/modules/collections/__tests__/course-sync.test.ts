import { describe, expect, it } from "vitest";
import { canImportCourseSync, mergeCourseSyncProperties, parseCourseSync } from "../course-sync";
import { getTemplate } from "../templates";

const source = { task_list: "Example term", generated_at: "2026-09-07T12:00:00Z", tasks: [
  { id: "source:1", title: "[CS 101] Read the syllabus", due: "2026-09-08", status: "needsAction", source_url: "https://example.edu/courses/1" },
  { id: "source:2", title: "[CS 101] Join the course forum", status: "completed" },
] };

describe("course-sync metadata", () => {
  it("accepts the canonical task envelope, preserving undated tasks and explicit course prefixes", () => {
    const parsed = parseCourseSync(source);
    expect(parsed.tasks[0]).toMatchObject({ id: "source:1", course: "CS 101", properties: { due: "2026-09-08", source_status: "needsAction" } });
    expect(parsed.tasks[1].properties).not.toHaveProperty("due");
    expect(parsed.capturedAt).toBe("2026-09-07T12:00:00.000Z");
    expect(canImportCourseSync(getTemplate("coursework")!.schema)).toBe(true);
    expect(canImportCourseSync(getTemplate("tasks")!.schema)).toBe(false);
  });

  it("rejects duplicates, malformed deadlines, arbitrary status, missing capture time, and unsafe links", () => {
    for (const input of [
      { ...source, tasks: [source.tasks[0], source.tasks[0]] },
      { ...source, generated_at: undefined },
      ...[{ due: "2026-02-30" }, { due_at: "2026-09-07T13:00:00" }, { status: "graded" }, { source_url: "javascript:alert(1)" }, { score: "100%" }, { timezone: "not-a-zone" }].map((patch) => ({ ...source, tasks: [{ ...source.tasks[0], ...patch }] })),
    ]) expect(() => parseCourseSync(input)).toThrow();
  });

  it("keeps exact deadlines, availability, late windows, and reservations separate", () => {
    const task = { ...source.tasks[0], due_at: "2026-09-08T23:59:00-05:00", available_at: "2026-09-07T00:00:00-05:00", late_until: "2026-09-09T23:59:00-05:00", reservation_at: "2026-09-08T10:00:00-05:00", timezone: "America/Chicago" };
    expect(parseCourseSync({ ...source, tasks: [task] }).tasks[0].properties).toMatchObject({ due: "2026-09-08", due_at: "2026-09-09T04:59:00.000Z", reservation_at: "2026-09-08T15:00:00.000Z", timezone: "America/Chicago" });
  });

  it("never infers completion from a score and preserves user completion, notes, progress, and reopenings", () => {
    const parsed = parseCourseSync({ ...source, tasks: [{ id: "1", title: "An action", score: 100 }] });
    expect(mergeCourseSyncProperties({}, parsed.tasks[0].properties).status).toBe("todo");
    expect(mergeCourseSyncProperties({ status: "done", notes: "my notes", source_status: "completed" }, { source_status: "unknown", source_notes: "new source notes" })).toMatchObject({ status: "done", notes: "my notes", source_status: "completed" });
    expect(mergeCourseSyncProperties({ status: "in_progress" }, { source_status: "needsAction" }).status).toBe("in_progress");
    expect(mergeCourseSyncProperties({ status: "todo", source_status: "completed" }, { source_status: "completed" }).status).toBe("todo");
    expect(mergeCourseSyncProperties({ status: "in_progress" }, { source_status: "completed" })).toMatchObject({ status: "done", completion_evidence: expect.any(String) });
  });
});
