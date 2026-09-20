"use client";

import { useEffect, useState } from "react";

/**
 * Labels for ids stored in `page` and `relation` properties. Fetched lazily and once per
 * id across every editor on the page, so a column of links costs one request per distinct id.
 */
type LabelKind = "page" | `item:${string}`;

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function keyFor(kind: LabelKind, id: string) {
  return `${kind}:${id}`;
}

export function rememberLabel(kind: LabelKind, id: string, label: string) {
  cache.set(keyFor(kind, id), label);
}

async function load(kind: LabelKind, id: string): Promise<string> {
  const url =
    kind === "page"
      ? `/api/articles/${encodeURIComponent(id)}`
      : `/api/collections/${encodeURIComponent(kind.slice(5))}/items/${encodeURIComponent(id)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const data = (await res.json()) as { title?: string };
    return typeof data.title === "string" ? data.title : "";
  } catch {
    return "";
  }
}

export function fetchLabel(kind: LabelKind, id: string): Promise<string> {
  const key = keyFor(kind, id);
  const known = cache.get(key);
  if (known !== undefined) return Promise.resolve(known);
  const inflight = pending.get(key);
  if (inflight) return inflight;
  const promise = load(kind, id).then((label) => {
    if (label) cache.set(key, label);
    pending.delete(key);
    return label;
  });
  pending.set(key, promise);
  return promise;
}

/** Keep storage ids out of the interface, including while loading or unavailable. */
export function useLabel(kind: LabelKind, id: string | null): string {
  const known = id ? cache.get(keyFor(kind, id)) : undefined;
  const [result, setResult] = useState<{ id: string; label: string } | null>(null);
  useEffect(() => {
    if (!id || known !== undefined) return;
    let active = true;
    fetchLabel(kind, id).then((label) => {
      if (active) setResult({ id, label });
    });
    return () => {
      active = false;
    };
  }, [kind, id, known]);
  if (!id) return "";
  return known ?? (result?.id === id ? result.label || "unavailable item" : "loading…");
}
