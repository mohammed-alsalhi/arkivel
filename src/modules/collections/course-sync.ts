/** Canonical course-sync metadata. Pure helpers shared by the importer and its preview UI. */
import { getTemplate } from "./templates";
import { validateProperties, type PropertySchema, type PropertyValues } from "./properties";

export type CourseSyncAction = "created" | "updated" | "unchanged" | "skipped";
export type CourseSyncReport = {
  dryRun: boolean;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  coursesCreated: number;
  preview: { id: string; title: string; action: CourseSyncAction; reason?: string }[];
  warnings: string[];
};

export type CourseSyncTask = { id: string; title: string; course?: string; properties: PropertyValues };
export type CourseSyncSource = { taskList: string; capturedAt: string; tasks: CourseSyncTask[] };

export class CourseSyncError extends Error {}

export function canImportCourseSync(schema: PropertySchema): boolean {
  return getTemplate("coursework")!.schema.every((expected) => {
    const actual = schema.find((property) => property.id === expected.id);
    if (!actual) return false;
    if (expected.id === "course") return actual.type === "text" || actual.type === "relation";
    if (actual.type !== expected.type) return false;
    if (expected.type === "select" && actual.type === "select") {
      return expected.options.every((option) => actual.options.some((candidate) => candidate.id === option.id));
    }
    return true;
  });
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, field: string, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new CourseSyncError(`${field} must be non-empty text (at most ${max} characters)`);
  }
  return value.trim();
}

function timestamp(value: unknown, field: string): string {
  const text = requiredText(value, field, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(text) || !Number.isFinite(Date.parse(text))) {
    throw new CourseSyncError(`${field} must be an ISO timestamp with a timezone`);
  }
  const date = validateProperties([{ id: "date", name: "date", type: "date" }], { date: text.slice(0, 10) });
  if (!date.ok) throw new CourseSyncError(`${field} contains an invalid date`);
  return new Date(text).toISOString();
}

/** Accepts the scraper's google-tasks-input.json without scraping or copying assessment content. */
export function parseCourseSync(input: unknown): CourseSyncSource {
  if (!record(input)) throw new CourseSyncError("source must be a course-sync object");
  const taskList = requiredText(input.task_list, "task_list", 200);
  const capturedAt = timestamp(input.generated_at, "generated_at");
  if (!Array.isArray(input.tasks) || input.tasks.length > 2000) throw new CourseSyncError("tasks must be an array of at most 2000 items");
  const seen = new Set<string>();
  const tasks = input.tasks.map((raw, index): CourseSyncTask => {
    if (!record(raw)) throw new CourseSyncError(`tasks[${index}] must be an object`);
    const id = requiredText(raw.id, `tasks[${index}].id`);
    const title = requiredText(raw.title, `tasks[${index}].title`);
    if (seen.has(id)) throw new CourseSyncError(`duplicate source id: ${id}`);
    seen.add(id);
    if (raw.status !== undefined && raw.status !== "needsAction" && raw.status !== "completed") {
      throw new CourseSyncError(`tasks[${index}].status must be needsAction or completed`);
    }
    const properties: PropertyValues = {
      source_id: id, source_list: taskList, source_updated: capturedAt,
      source_status: raw.status ?? "unknown",
    };
    for (const [source, target] of Object.entries({ due: "due", source_url: "source_url", notes: "source_notes", score: "score", kind: "kind" })) {
      if (raw[source] !== undefined) properties[target] = raw[source] as PropertyValues[string];
    }
    if (typeof properties.source_notes === "string" && properties.source_notes.length > 20000) throw new CourseSyncError(`tasks[${index}].notes is too long`);
    for (const field of ["due_at", "available_at", "late_until", "reservation_at"]) {
      if (raw[field] !== undefined) properties[field] = timestamp(raw[field], `tasks[${index}].${field}`);
    }
    if (raw.timezone !== undefined) {
      const zone = requiredText(raw.timezone, `tasks[${index}].timezone`, 100);
      try { new Intl.DateTimeFormat("en", { timeZone: zone }); } catch { throw new CourseSyncError(`tasks[${index}].timezone must be an IANA timezone`); }
      properties.timezone = zone;
    }
    // Do not infer a course from arbitrary title words; the canonical prefix is explicit metadata.
    const course = raw.course === undefined ? title.match(/^\[([^\]]+)\]\s/)?.[1] : requiredText(raw.course, `tasks[${index}].course`, 200);
    const checked = validateProperties(getTemplate("coursework")!.schema, properties);
    if (!checked.ok) throw new CourseSyncError(`tasks[${index}]: ${Object.entries(checked.errors).map(([key, error]) => `${key} ${error}`).join("; ")}`);
    // Omitted fields preserve last verified values when a partial source is imported.
    return { id, title, ...(course ? { course } : {}), properties: Object.fromEntries(Object.keys(properties).map((key) => [key, checked.value[key]])) };
  });
  return { taskList, capturedAt, tasks };
}

/** Source completion may close work once; later refreshes preserve a user's status and notes. */
export function mergeCourseSyncProperties(stored: PropertyValues, incoming: PropertyValues): PropertyValues {
  const properties = { ...stored, ...incoming };
  if (stored.source_status === "completed" || (incoming.source_status === "unknown" && stored.source_status)) properties.source_status = stored.source_status;
  if (incoming.source_status === "completed" && stored.source_status !== "completed") {
    properties.status = "done";
    if (!stored.completion_evidence) properties.completion_evidence = "explicit completed status in course-sync source";
  } else {
    properties.status = stored.status || "todo";
  }
  return properties;
}
