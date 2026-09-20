"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, DataTable, EmptyState, Field, Input } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { CollectionDTO, CollectionSummary } from "@/modules/collections/model";
import { COLLECTION_TEMPLATES, type TemplateId } from "@/modules/collections/templates";
import { api } from "./api";
import { ChoicePicker } from "./ChoicePicker";

type Props = {
  collections: CollectionSummary[];
  categories: { id: string; name: string }[];
  canEdit: boolean;
};

/** The `/collections` index: one row per collection plus an inline "new collection" form. */
export function CollectionsIndex({ collections, categories, canEdit }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [template, setTemplate] = useState<TemplateId>("blank");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ message: string; fields: Record<string, string> } | null>(null);

  const chosen = COLLECTION_TEMPLATES.find((entry) => entry.id === template);

  const create = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    const result = await api<CollectionDTO>("/api/collections", {
      method: "POST",
      body: { name: name.trim(), categoryId: categoryId || null, template },
    });
    setSaving(false);
    if (!result.ok) {
      setError({ message: result.error, fields: result.fields });
      return;
    }
    router.push(`/collections/${encodeURIComponent(result.data.slug)}`);
  };

  return (
    <>
      {canEdit && (
        <div className="collections-index-actions">
          <Button aria-pressed={open} onClick={() => setOpen((value) => !value)}>
            new collection
          </Button>
        </div>
      )}

      {open && canEdit && (
        <section className="collections-panel" aria-label="new collection">
          <form
            className="collections-index-form"
            onSubmit={(event) => {
              event.preventDefault();
              create();
            }}
          >
            <Field label="name" htmlFor="collection-name" error={error?.fields.name}>
              <Input id="collection-name" value={name} autoFocus onChange={(event) => setName(event.target.value)} placeholder="tasks" />
            </Field>
            <Field label="space" htmlFor="collection-space" error={error?.fields.categoryId}>
              <ChoicePicker id="collection-space" label="space" selected={[categoryId]} clearable={false} disabled={saving}
                options={[{ id: "", label: "none" }, ...categories.map((category) => ({ id: category.id, label: category.name }))]}
                onPick={(option) => setCategoryId(option?.id ?? "")} />
            </Field>
            <Field label="start from" htmlFor="collection-template" hint={chosen?.description}>
              <ChoicePicker id="collection-template" label="start from" selected={[template]} clearable={false} disabled={saving}
                options={COLLECTION_TEMPLATES.map((entry) => ({ id: entry.id, label: entry.name }))}
                onPick={(option) => { if (option) setTemplate(option.id as TemplateId); }} />
            </Field>
            <div className="collections-index-form-actions">
              <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
                {saving ? "creating…" : "create"}
              </Button>
              <Button onClick={() => setOpen(false)}>cancel</Button>
              {error && !error.fields.name && !error.fields.categoryId && <span className="ui-field-error">{error.message}</span>}
            </div>
          </form>
        </section>
      )}

      {collections.length === 0 ? (
        <EmptyState
          title="no collections yet"
          description={canEdit ? "start one from a template: tasks, a reading list, or a simple table." : "nothing here yet."}
        />
      ) : (
        <DataTable>
          <colgroup>
            <col />
            <col style={{ width: "22%" }} />
            <col style={{ width: "6rem" }} />
            <col style={{ width: "11rem" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">name</th>
              <th scope="col">space</th>
              <th scope="col">items</th>
              <th scope="col">updated</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.id}>
                <td>
                  <Link href={`/collections/${encodeURIComponent(collection.slug)}`} className="font-medium">
                    {collection.name}
                  </Link>
                </td>
                <td className="text-muted">
                  {collection.category ? (
                    <Link href={`/categories/${encodeURIComponent(collection.category.slug)}`}>{collection.category.name}</Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-muted">{collection.itemCount}</td>
                <td className="text-muted">{formatDate(collection.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
