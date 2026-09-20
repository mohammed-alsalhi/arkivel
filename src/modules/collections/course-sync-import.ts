import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { readSchema, validateProperties, type PropertyValues } from "./properties";
import { getTemplate } from "./templates";
import { canImportCourseSync, CourseSyncError, mergeCourseSyncProperties, parseCourseSync, type CourseSyncReport } from "./course-sync";

function sourceItemId(collectionId: string, sourceList: string, sourceId: string): string {
  return `sync_${createHash("sha256").update(JSON.stringify([collectionId, sourceList, sourceId])).digest("hex")}`;
}

/** A collection-scoped transaction makes repeat imports atomic, including their course relations. */
export async function importCourseSync(collectionId: string, input: unknown, dryRun = true): Promise<CourseSyncReport> {
  const source = parseCourseSync(input);
  const report = await prisma.$transaction(async (tx) => {
    // Serialize imports before reading current values; stable row ids also prevent duplicate identities.
    await tx.$queryRaw`SELECT id FROM "Collection" WHERE id = ${collectionId} FOR UPDATE`;
    const collection = await tx.collection.findUnique({ where: { id: collectionId } });
    const schema = readSchema(collection?.schema);
    if (!collection || !canImportCourseSync(schema)) throw new CourseSyncError("choose a coursework collection with its import properties intact");
    const relation = schema.find((property) => property.id === "course" && property.type === "relation");
    const courseCollectionId = relation?.type === "relation" ? relation.collectionId : null;
    if (courseCollectionId === collectionId) throw new CourseSyncError("course must relate to a separate courses collection");
    if (courseCollectionId) await tx.$queryRaw`SELECT id FROM "Collection" WHERE id = ${courseCollectionId} FOR UPDATE`;
    const courseCollection = courseCollectionId ? await tx.collection.findUnique({ where: { id: courseCollectionId } }) : null;
    const courseSchema = readSchema(courseCollection?.schema);
    if (courseCollectionId && (!courseCollection || !getTemplate("courses")!.schema.every((expected) => courseSchema.some((actual) => actual.id === expected.id && actual.type === expected.type)))) {
      throw new CourseSyncError("course relation must target a courses collection with its import properties intact");
    }

    const itemIds = source.tasks.map((task) => sourceItemId(collectionId, source.taskList, task.id));
    // Lock item rows before merging so a concurrent manual edit cannot be overwritten from a stale read.
    await tx.$queryRaw`SELECT id FROM "CollectionItem" WHERE "collectionId" = ${collectionId} FOR UPDATE`;
    const existingRows = await tx.collectionItem.findMany({ where: { collectionId, id: { in: itemIds } } });
    const existing = new Map(existingRows.map((row) => [row.id, row]));
    const courseIds = source.tasks.flatMap((task) => courseCollectionId && task.course ? [sourceItemId(courseCollectionId, source.taskList, task.course)] : []);
    const courses = new Set(courseCollectionId ? (await tx.collectionItem.findMany({ where: { collectionId: courseCollectionId, id: { in: courseIds } }, select: { id: true } })).map((row) => row.id) : []);
    const result: CourseSyncReport = { dryRun, created: 0, updated: 0, unchanged: 0, skipped: 0, coursesCreated: 0, preview: [], warnings: [] };

    for (const task of source.tasks) {
      const id = sourceItemId(collectionId, source.taskList, task.id);
      const current = existing.get(id);
      const stored = validateProperties(schema, current?.properties).value;
      if (typeof stored.source_updated === "string" && stored.source_updated > source.capturedAt) {
        result.skipped += 1;
        if (result.preview.length < 100) result.preview.push({ id: task.id, title: task.title, action: "skipped", reason: "a newer source snapshot is already stored" });
        continue;
      }
      const incoming = { ...task.properties };
      if (task.course) {
        if (courseCollectionId) {
          const courseId = sourceItemId(courseCollectionId, source.taskList, task.course);
          incoming.course = [courseId];
          if (!courses.has(courseId)) {
            const courseProperties = validateProperties(courseSchema, { code: task.course, term: source.taskList, source_id: JSON.stringify([source.taskList, task.course]) });
            if (!courseProperties.ok) throw new CourseSyncError("course properties no longer match the courses template");
            if (!dryRun) await tx.collectionItem.create({ data: { id: courseId, collectionId: courseCollectionId, title: task.course, properties: courseProperties.value } });
            courses.add(courseId);
            result.coursesCreated += 1;
          }
        } else incoming.course = task.course;
      }
      const merged = mergeCourseSyncProperties(stored, incoming);
      const checked = validateProperties(schema, merged);
      if (!checked.ok) throw new CourseSyncError(`item ${task.id}: ${Object.values(checked.errors).join("; ")}`);
      const changed = !current || current.title !== task.title || JSON.stringify(stored) !== JSON.stringify(checked.value);
      const action = !current ? "created" : changed ? "updated" : "unchanged";
      result[action] += 1;
      if (result.preview.length < 100) result.preview.push({ id: task.id, title: task.title, action });
      if (dryRun || !changed) continue;
      const data = { title: task.title, properties: checked.value as PropertyValues };
      if (current) await tx.collectionItem.update({ where: { id }, data });
      else await tx.collectionItem.create({ data: { id, collectionId, ...data } });
    }
    if (source.tasks.length > 100) result.warnings.push("Preview shows the first 100 items; counts include the complete import.");
    if (result.skipped) result.warnings.push("Older source records were skipped. Existing completion and absent records are preserved.");
    return result;
  }, { timeout: 60000 });
  if (!dryRun) await logAudit("collection.import", { type: "collection", id: collectionId }, {
    created: report.created, updated: report.updated, unchanged: report.unchanged, skipped: report.skipped, coursesCreated: report.coursesCreated,
  });
  return report;
}
