"use client";

import { FormEvent, useEffect, useState } from "react";
import CategoryManager from "@/components/CategoryManager";
import { Page, PageHeader, Section } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

const TRAIL = [TRAIL_ROOTS.admin, { label: "spaces" }];

type Category = {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
};

function flatten(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...flatten(category.children ?? [])]);
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [message, setMessage] = useState("");
  const [merging, setMerging] = useState(false);

  async function loadCategories() {
    const response = await fetch("/api/categories");
    const data = await response.json();
    setCategories(Array.isArray(data) ? flatten(data) : []);
  }

  useEffect(() => {
    loadCategories().catch(() => setCategories([]));
  }, []);

  async function merge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId) return;

    const source = categories.find((category) => category.id === sourceId);
    const target = categories.find((category) => category.id === targetId);
    if (!confirm(`merge “${source?.name}” into “${target?.name}”? the source space will be deleted.`)) return;

    setMerging(true);
    setMessage("");
    const response = await fetch("/api/admin/categories/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, targetId }),
    });
    const result = await response.json().catch(() => ({}));
    setMerging(false);

    if (!response.ok) {
      setMessage(result.error ?? "could not merge the spaces. try again.");
      return;
    }

    setMessage(`merged ${result.sourceName} into ${result.targetName}.`);
    setSourceId("");
    setTargetId("");
    await loadCategories();
  }

  return (
    <Page trail={TRAIL}>
      <PageHeader title="spaces" description="manage the spaces shown in the library tree." />

      <CategoryManager />

      <Section title="merge spaces">
        <form onSubmit={merge} className="grid gap-3 border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-[12px] text-muted">
            source
            <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="mt-1 block w-full border border-border bg-background px-2 py-1.5 text-foreground">
              <option value="">choose a space</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="text-[12px] text-muted">
            destination
            <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="mt-1 block w-full border border-border bg-background px-2 py-1.5 text-foreground">
              <option value="">choose a space</option>
              {categories.filter((category) => category.id !== sourceId).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <button type="submit" disabled={!sourceId || !targetId || merging} className="self-end border border-border px-3 py-1.5 text-[13px] disabled:opacity-50">
            {merging ? "merging…" : "merge"}
          </button>
        </form>
        {message && <p className="mt-2 text-[12px] text-muted" aria-live="polite">{message}</p>}
      </Section>
    </Page>
  );
}
