import type { FieldErrors } from "@/modules/collections/model";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; fields: Record<string, string>; status: number };

/** JSON fetch against the collections API; 400s come back as `{ error, fields }`. */
export async function api<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const payload = (await res.json().catch(() => null)) as (T & Partial<FieldErrors>) | null;
    if (res.ok) return { ok: true, data: payload as T };
    return {
      ok: false,
      status: res.status,
      error: (payload && typeof payload.error === "string" && payload.error) || `request failed (${res.status})`,
      fields: (payload && payload.fields) || {},
    };
  } catch {
    return { ok: false, status: 0, error: "network error", fields: {} };
  }
}

/** One line describing a failed write: the first field error, else the message. */
export function describeFailure(result: { error: string; fields: Record<string, string> }): string {
  const [field, message] = Object.entries(result.fields)[0] ?? [];
  return field ? `${field}: ${message}` : result.error;
}
