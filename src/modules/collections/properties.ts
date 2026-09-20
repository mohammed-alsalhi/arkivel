/**
 * Property schema, value validation, and in-memory views for the collections engine.
 *
 * Pure: no prisma, no react. Shared by the API routes, server queries, and the client table.
 */

export type PropertyTone = "default" | "success" | "warning" | "danger" | "info";

export const PROPERTY_TONES: readonly PropertyTone[] = ["default", "success", "warning", "danger", "info"];

export type SelectOption = { id: string; label: string; tone: PropertyTone };

export type PropertyType =
  | "title"
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "checkbox"
  | "url"
  | "person"
  | "page"
  | "relation"
  | "created_time"
  | "updated_time";

export const PROPERTY_TYPES: readonly PropertyType[] = [
  "title",
  "text",
  "number",
  "select",
  "multi_select",
  "date",
  "checkbox",
  "url",
  "person",
  "page",
  "relation",
  "created_time",
  "updated_time",
];

/** Property types whose value comes from the item row itself, never from `item.properties`. */
export const COMPUTED_TYPES: readonly PropertyType[] = ["title", "created_time", "updated_time"];

type PropertyBase = { id: string; name: string };

export type PropertyDefinition =
  | (PropertyBase & { type: "title" })
  | (PropertyBase & { type: "text" })
  | (PropertyBase & { type: "number" })
  | (PropertyBase & { type: "select"; options: SelectOption[] })
  | (PropertyBase & { type: "multi_select"; options: SelectOption[] })
  | (PropertyBase & { type: "date" })
  | (PropertyBase & { type: "checkbox" })
  | (PropertyBase & { type: "url" })
  | (PropertyBase & { type: "person" })
  | (PropertyBase & { type: "page" })
  | (PropertyBase & { type: "relation"; collectionId: string })
  | (PropertyBase & { type: "created_time" })
  | (PropertyBase & { type: "updated_time" });

export type PropertySchema = PropertyDefinition[];

/** What a stored property value may be, by type. */
export type PropertyValue = string | number | boolean | string[] | null;
export type PropertyValues = Record<string, PropertyValue>;

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPropertyType(value: unknown): value is PropertyType {
  return typeof value === "string" && (PROPERTY_TYPES as readonly string[]).includes(value);
}

function isTone(value: unknown): value is PropertyTone {
  return typeof value === "string" && (PROPERTY_TONES as readonly string[]).includes(value);
}

/** A stable id for a new property or option, derived from its label. */
export function propertyIdFromName(name: string, taken: Iterable<string> = []): string {
  const used = new Set(taken);
  const base =
    name
      .trim()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "")
      .slice(0, 48) || "property";
  const root = /^[a-z0-9]/.test(base) ? base : `p_${base}`;
  if (!used.has(root)) return root;
  let index = 2;
  while (used.has(`${root}_${index}`)) index += 1;
  return `${root}_${index}`;
}

// ---------------------------------------------------------------------------
// schema validation
// ---------------------------------------------------------------------------

export type SchemaValidation =
  | { ok: true; value: PropertySchema; errors: string[] }
  | { ok: false; value: PropertySchema; errors: string[] };

function validateOptions(raw: unknown, path: string, errors: string[]): SelectOption[] {
  if (!Array.isArray(raw)) {
    errors.push(`${path}: options must be a list`);
    return [];
  }
  const options: SelectOption[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const where = `${path}.options[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${where}: option must be an object`);
      return;
    }
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    if (!id) errors.push(`${where}: option id is required`);
    else if (seen.has(id)) errors.push(`${where}: duplicate option id "${id}"`);
    if (!label) errors.push(`${where}: option label is required`);
    const tone = entry.tone === undefined ? "default" : entry.tone;
    if (!isTone(tone)) errors.push(`${where}: unknown tone`);
    if (id && label && isTone(tone) && !seen.has(id)) {
      seen.add(id);
      options.push({ id, label, tone });
    }
  });
  return options;
}

/** Checks a schema from the outside world: exactly one title, unique ids, valid types and options. */
export function validateSchema(input: unknown): SchemaValidation {
  const errors: string[] = [];
  if (!Array.isArray(input)) {
    return { ok: false, value: [], errors: ["schema must be a list of properties"] };
  }
  const value: PropertySchema = [];
  const ids = new Set<string>();
  let titles = 0;

  input.forEach((entry, index) => {
    const path = `schema[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${path}: property must be an object`);
      return;
    }
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const type = entry.type;
    if (!id) errors.push(`${path}: id is required`);
    else if (!ID_PATTERN.test(id)) errors.push(`${path}: id "${id}" may only use letters, digits, "_" and "-"`);
    else if (ids.has(id)) errors.push(`${path}: duplicate id "${id}"`);
    if (!name) errors.push(`${path}: name is required`);
    if (!isPropertyType(type)) {
      errors.push(`${path}: unknown type "${String(type)}"`);
      return;
    }
    if (!id || !name || ids.has(id) || !ID_PATTERN.test(id)) return;
    ids.add(id);

    switch (type) {
      case "title":
        titles += 1;
        value.push({ id, name, type });
        break;
      case "select":
      case "multi_select":
        value.push({ id, name, type, options: validateOptions(entry.options, path, errors) });
        break;
      case "relation": {
        const collectionId = typeof entry.collectionId === "string" ? entry.collectionId.trim() : "";
        if (!collectionId) errors.push(`${path}: relation needs a target collectionId`);
        value.push({ id, name, type, collectionId });
        break;
      }
      default:
        value.push({ id, name, type });
    }
  });

  if (titles === 0) errors.push("schema needs exactly one title property");
  if (titles > 1) errors.push("schema may only have one title property");

  return errors.length ? { ok: false, value, errors } : { ok: true, value, errors };
}

/** Reads a stored schema leniently: invalid entries are dropped instead of failing. */
export function readSchema(stored: unknown): PropertySchema {
  return validateSchema(stored).value;
}

export function titleProperty(schema: PropertySchema): PropertyDefinition | undefined {
  return schema.find((property) => property.type === "title");
}

// ---------------------------------------------------------------------------
// value validation
// ---------------------------------------------------------------------------

export type PropertyValidation = {
  ok: boolean;
  value: PropertyValues;
  errors: Record<string, string>;
};

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function validateValue(
  property: PropertyDefinition,
  raw: unknown,
): { ok: true; value: PropertyValue } | { ok: false; error: string } {
  if (isEmpty(raw)) {
    if (property.type === "checkbox") return { ok: true, value: false };
    if (property.type === "multi_select" || property.type === "relation") return { ok: true, value: [] };
    return { ok: true, value: null };
  }

  switch (property.type) {
    case "text":
      return typeof raw === "string" ? { ok: true, value: raw } : { ok: false, error: "must be text" };
    case "number":
      return typeof raw === "number" && Number.isFinite(raw)
        ? { ok: true, value: raw }
        : { ok: false, error: "must be a number" };
    case "checkbox":
      return typeof raw === "boolean" ? { ok: true, value: raw } : { ok: false, error: "must be true or false" };
    case "date": {
      if (typeof raw !== "string" || !DATE_PATTERN.test(raw) || Number.isNaN(Date.parse(raw)) || new Date(raw).toISOString().slice(0, 10) !== raw) {
        return { ok: false, error: "must be a date (yyyy-mm-dd)" };
      }
      return { ok: true, value: raw };
    }
    case "url": {
      if (typeof raw !== "string") return { ok: false, error: "must be a url" };
      const trimmed = raw.trim();
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("scheme");
      } catch {
        return { ok: false, error: "must be an http(s) url" };
      }
      return { ok: true, value: trimmed };
    }
    case "select": {
      if (typeof raw !== "string") return { ok: false, error: "must be an option id" };
      return property.options.some((option) => option.id === raw)
        ? { ok: true, value: raw }
        : { ok: false, error: "unknown option" };
    }
    case "multi_select": {
      if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== "string")) {
        return { ok: false, error: "must be a list of option ids" };
      }
      const known = new Set(property.options.map((option) => option.id));
      const unknown = raw.find((entry: string) => !known.has(entry));
      if (unknown !== undefined) return { ok: false, error: `unknown option "${unknown}"` };
      return { ok: true, value: Array.from(new Set(raw as string[])) };
    }
    case "person":
    case "page":
      return typeof raw === "string" && raw.trim()
        ? { ok: true, value: raw.trim() }
        : { ok: false, error: "must be an id" };
    case "relation": {
      if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== "string" || !entry.trim())) {
        return { ok: false, error: "must be a list of item ids" };
      }
      return { ok: true, value: Array.from(new Set((raw as string[]).map((id) => id.trim()))) };
    }
    case "title":
    case "created_time":
    case "updated_time":
      // Never stored in properties; handled by the caller.
      return { ok: true, value: null };
  }
}

/**
 * Validates a properties object against a schema. Unknown keys and computed
 * properties (title, created_time, updated_time) are dropped; wrong types are
 * reported per property id. `value` is always the cleaned record, even when `ok` is false.
 */
export function validateProperties(schema: PropertySchema, input: unknown): PropertyValidation {
  const errors: Record<string, string> = {};
  const value: PropertyValues = {};
  const source = isRecord(input) ? input : {};
  if (input !== undefined && input !== null && !isRecord(input)) {
    return { ok: false, value, errors: { properties: "must be an object" } };
  }

  for (const property of schema) {
    if (COMPUTED_TYPES.includes(property.type)) continue;
    const result = validateValue(property, source[property.id]);
    if (result.ok) value[property.id] = result.value;
    else errors[property.id] = result.error;
  }

  return { ok: Object.keys(errors).length === 0, value, errors };
}

/** Fills every stored property with its empty value so the client always sees a full record. */
export function emptyProperties(schema: PropertySchema): PropertyValues {
  return validateProperties(schema, {}).value;
}

// ---------------------------------------------------------------------------
// views
// ---------------------------------------------------------------------------

export type FilterOperator = "eq" | "neq" | "contains" | "empty" | "not_empty" | "gt" | "lt";

export const FILTER_OPERATORS: readonly FilterOperator[] = ["eq", "neq", "contains", "empty", "not_empty", "gt", "lt"];

export type Filter = { property: string; op: FilterOperator; value?: PropertyValue };
export type Sort = { property: string; direction: "asc" | "desc" };

export type ViewConfig = {
  filters: Filter[];
  sorts: Sort[];
  groupBy?: string;
  visible: string[];
};

export type ViewKind = "table" | "board" | "list" | "calendar";
export const VIEW_KINDS: readonly ViewKind[] = ["table", "board", "list", "calendar"];

/** A table view showing every property, in schema order. */
export function defaultViewFor(schema: PropertySchema): ViewConfig {
  return { filters: [], sorts: [], visible: schema.map((property) => property.id) };
}

/** Cleans a view config from the outside world against a schema; unknown properties are dropped. */
export function validateViewConfig(schema: PropertySchema, input: unknown): ViewConfig {
  const known = new Set(schema.map((property) => property.id));
  const fallback = defaultViewFor(schema);
  if (!isRecord(input)) return fallback;

  const filters: Filter[] = Array.isArray(input.filters)
    ? input.filters.flatMap((entry): Filter[] => {
        if (!isRecord(entry) || typeof entry.property !== "string" || !known.has(entry.property)) return [];
        if (typeof entry.op !== "string" || !(FILTER_OPERATORS as readonly string[]).includes(entry.op)) return [];
        const value = entry.value;
        const ok =
          value === undefined ||
          value === null ||
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          (Array.isArray(value) && value.every((item) => typeof item === "string"));
        if (!ok) return [];
        return [{ property: entry.property, op: entry.op as FilterOperator, value: value as PropertyValue | undefined }];
      })
    : [];

  const sorts: Sort[] = Array.isArray(input.sorts)
    ? input.sorts.flatMap((entry): Sort[] => {
        if (!isRecord(entry) || typeof entry.property !== "string" || !known.has(entry.property)) return [];
        const direction = entry.direction === "desc" ? "desc" : "asc";
        return [{ property: entry.property, direction }];
      })
    : [];

  const visible = Array.isArray(input.visible)
    ? input.visible.filter((id): id is string => typeof id === "string" && known.has(id))
    : fallback.visible;

  const groupBy = typeof input.groupBy === "string" && known.has(input.groupBy) ? input.groupBy : undefined;

  return { filters, sorts, visible, ...(groupBy ? { groupBy } : {}) };
}

/** The minimal item shape the view engine needs; API rows and prisma rows both satisfy it. */
export type ViewItem = {
  id: string;
  title: string;
  properties: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

/** Reads a property's value from an item, resolving computed properties from the row. */
export function propertyValue(item: ViewItem, property: PropertyDefinition): PropertyValue {
  switch (property.type) {
    case "title":
      return item.title;
    case "created_time":
      return toIso(item.createdAt);
    case "updated_time":
      return toIso(item.updatedAt);
    default: {
      const record = isRecord(item.properties) ? item.properties : {};
      const raw = record[property.id];
      if (raw === undefined) return null;
      return raw as PropertyValue;
    }
  }
}

/** A human-readable string for sorting and filtering; option ids resolve to labels. */
export function displayValue(property: PropertyDefinition, value: PropertyValue): string {
  if (value === null || value === undefined) return "";
  if (property.type === "select") {
    return property.options.find((option) => option.id === value)?.label ?? String(value);
  }
  if (property.type === "multi_select" && Array.isArray(value)) {
    return value.map((id) => property.options.find((option) => option.id === id)?.label ?? id).join(", ");
  }
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function isValueEmpty(value: PropertyValue): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "boolean") return value === false;
  return false;
}

function matches(property: PropertyDefinition, value: PropertyValue, filter: Filter): boolean {
  switch (filter.op) {
    case "empty":
      return isValueEmpty(value);
    case "not_empty":
      return !isValueEmpty(value);
    case "eq":
      if (Array.isArray(value)) {
        return typeof filter.value === "string" ? value.includes(filter.value) : false;
      }
      return value === filter.value;
    case "neq":
      if (Array.isArray(value)) {
        return typeof filter.value === "string" ? !value.includes(filter.value) : true;
      }
      return value !== filter.value;
    case "contains": {
      const needle = displayValue(property, filter.value ?? null).toLowerCase();
      if (!needle) return true;
      return displayValue(property, value).toLowerCase().includes(needle);
    }
    case "gt":
    case "lt": {
      if (value === null || filter.value === null || filter.value === undefined) return false;
      const left = typeof value === "number" ? value : String(value);
      const right = typeof filter.value === "number" ? filter.value : String(filter.value);
      if (typeof left !== typeof right) return false;
      return filter.op === "gt" ? left > right : left < right;
    }
  }
}

/** Orders two non-empty values; empties are handled by the caller so they stay last in either direction. */
function compare(property: PropertyDefinition, left: PropertyValue, right: PropertyValue): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "boolean" && typeof right === "boolean") return Number(left) - Number(right);
  if (property.type === "select") {
    const order = property.options.map((option) => option.id);
    return order.indexOf(String(left)) - order.indexOf(String(right));
  }
  return displayValue(property, left).localeCompare(displayValue(property, right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export type ViewGroup<T extends ViewItem> = { key: string | null; label: string; items: T[] };

export type ViewResult<T extends ViewItem> = {
  items: T[];
  groups: ViewGroup<T>[] | null;
  columns: PropertyDefinition[];
};

/** Filters, sorts, and optionally groups items in memory according to a view config. */
export function applyView<T extends ViewItem>(items: T[], config: ViewConfig, schema: PropertySchema): ViewResult<T> {
  const byId = new Map(schema.map((property) => [property.id, property]));

  const filters = config.filters.filter((filter) => byId.has(filter.property));
  let result = items.filter((item) =>
    filters.every((filter) => {
      const property = byId.get(filter.property)!;
      return matches(property, propertyValue(item, property), filter);
    }),
  );

  const sorts = config.sorts.filter((sort) => byId.has(sort.property));
  if (sorts.length) {
    result = [...result].sort((left, right) => {
      for (const sort of sorts) {
        const property = byId.get(sort.property)!;
        const leftValue = propertyValue(left, property);
        const rightValue = propertyValue(right, property);
        const leftEmpty = isValueEmpty(leftValue);
        const rightEmpty = isValueEmpty(rightValue);
        if (leftEmpty !== rightEmpty) return leftEmpty ? 1 : -1;
        if (leftEmpty) continue;
        const delta = compare(property, leftValue, rightValue);
        if (delta !== 0) return sort.direction === "desc" ? -delta : delta;
      }
      return 0;
    });
  }

  const columns = config.visible
    .map((id) => byId.get(id))
    .filter((property): property is PropertyDefinition => Boolean(property));

  const groupProperty = config.groupBy ? byId.get(config.groupBy) : undefined;
  if (!groupProperty) return { items: result, groups: null, columns };

  const buckets = new Map<string | null, T[]>();
  const keyFor = (value: PropertyValue): string | null => {
    if (isValueEmpty(value)) return null;
    if (Array.isArray(value)) return value[0] ?? null;
    return String(value);
  };
  for (const item of result) {
    const key = keyFor(propertyValue(item, groupProperty));
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }

  let keys = Array.from(buckets.keys());
  if (groupProperty.type === "select" || groupProperty.type === "multi_select") {
    const order = groupProperty.options.map((option) => option.id);
    keys = keys.sort((left, right) => {
      if (left === null) return 1;
      if (right === null) return -1;
      return order.indexOf(left) - order.indexOf(right);
    });
  } else {
    keys = keys.sort((left, right) => {
      if (left === null) return 1;
      if (right === null) return -1;
      return left.localeCompare(right, undefined, { numeric: true });
    });
  }

  const groups: ViewGroup<T>[] = keys.map((key) => ({
    key,
    label: key === null ? "no value" : displayValue(groupProperty, key),
    items: buckets.get(key)!,
  }));
  return { items: result, groups, columns };
}
