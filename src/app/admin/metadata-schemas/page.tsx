"use client";

import { useState, useEffect } from "react";
import { Button, DataTable, EmptyState, IconButton, Page, PageHeader, SectionPanel } from "@/components/ui";

type FieldType = "text" | "number" | "date" | "boolean" | "select";

type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  options?: string; // comma-separated for select type
  required?: boolean;
};

type Schema = {
  id: string;
  categoryId: string;
  fields: FieldDef[];
  category: { id: string; name: string; slug: string };
};

type Category = { id: string; name: string; slug: string };

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes/No" },
  { value: "select", label: "Select (dropdown)" },
];

function emptyField(): FieldDef {
  return { name: "", label: "", type: "text", options: "", required: false };
}

export default function MetadataSchemasPage() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Schema | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [fields, setFields] = useState<FieldDef[]>([emptyField()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const [sRes, cRes] = await Promise.all([fetch("/api/metadata-schemas"), fetch("/api/categories")]);
    const [sData, cData] = await Promise.all([sRes.json(), cRes.json()]);
    if (Array.isArray(sData)) setSchemas(sData);
    if (Array.isArray(cData)) setCategories(cData);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setSelectedCategory("");
    setFields([emptyField()]);
    setError("");
  }

  function startEdit(s: Schema) {
    setEditing(s);
    setCreating(false);
    setSelectedCategory(s.categoryId);
    setFields(s.fields.length > 0 ? s.fields : [emptyField()]);
    setError("");
  }

  function updateField(i: number, patch: Partial<FieldDef>) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function addField() {
    setFields((prev) => [...prev, emptyField()]);
  }

  function removeField(i: number) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError("");
    const catId = editing?.categoryId ?? selectedCategory;
    if (!catId) { setError("Select a category"); return; }
    const validFields = fields.filter((f) => f.name.trim() && f.label.trim());
    if (validFields.length === 0) { setError("Add at least one field with name and label"); return; }

    setSaving(true);
    const res = await fetch("/api/metadata-schemas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: catId, fields: validFields }),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed to save"); return; }
    setEditing(null);
    setCreating(false);
    load();
  }

  const usedCategoryIds = new Set(schemas.map((s) => s.categoryId));
  const availableCategories = categories.filter((c) => !usedCategoryIds.has(c.id));

  return (
    <Page>
      <PageHeader
        title="Custom metadata schemas"
        description="Define typed metadata fields per category. These appear in the article editor when an article belongs to that category, and values are stored in the article's metadata object."
        actions={<Button onClick={startCreate}>+ New schema</Button>}
      />

      {/* Form */}
      {(creating || editing) && (
        <SectionPanel
          className="mb-4"
          title={editing ? `Edit schema: ${editing.category.name}` : "New schema"}
          bodyClassName="space-y-3"
        >
            {!editing && (
              <div>
                <label className="block text-[11px] text-muted font-bold mb-0.5">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-border bg-surface px-2 py-1 text-[12px] focus:border-accent focus:outline-none"
                >
                  <option value="">— Select category —</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted font-bold">Fields</span>
                <Button onClick={addField}>+ Add field</Button>
              </div>
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={i} className="flex gap-2 items-start border border-border p-2 bg-surface">
                    <div className="flex-1 space-y-1">
                      <div className="flex gap-2">
                        <input
                          value={f.name}
                          onChange={(e) => updateField(i, { name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                          placeholder="field_name"
                          className="flex-1 border border-border bg-surface px-2 py-0.5 text-[11px] font-mono focus:border-accent focus:outline-none"
                        />
                        <input
                          value={f.label}
                          onChange={(e) => updateField(i, { label: e.target.value })}
                          placeholder="Display label"
                          className="flex-1 border border-border bg-surface px-2 py-0.5 text-[11px] focus:border-accent focus:outline-none"
                        />
                        <select
                          value={f.type}
                          onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                          className="border border-border bg-surface px-1 py-0.5 text-[11px] focus:border-accent focus:outline-none"
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      {f.type === "select" && (
                        <input
                          value={f.options ?? ""}
                          onChange={(e) => updateField(i, { options: e.target.value })}
                          placeholder="Option 1, Option 2, Option 3"
                          className="w-full border border-border bg-surface px-2 py-0.5 text-[11px] focus:border-accent focus:outline-none"
                        />
                      )}
                      <label className="flex items-center gap-1 text-[11px] text-muted">
                        <input
                          type="checkbox"
                          checked={f.required ?? false}
                          onChange={(e) => updateField(i, { required: e.target.checked })}
                          className="pointer-coarse:h-5 pointer-coarse:w-5"
                        />
                        Required
                      </label>
                    </div>
                    <IconButton
                      label="Remove field"
                      onClick={() => removeField(i)}
                      className="text-danger mt-1"
                    >
                      ✕
                    </IconButton>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-[12px] text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save schema"}
              </Button>
              <Button onClick={() => { setEditing(null); setCreating(false); }}>
                Cancel
              </Button>
            </div>
        </SectionPanel>
      )}

      {/* Schema list */}
      {loading ? (
        <p className="text-[13px] text-muted italic">Loading…</p>
      ) : schemas.length === 0 ? (
        <EmptyState title="No metadata schemas defined yet." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Category</th>
              <th>Fields</th>
              <th className="w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schemas.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.category.name}</td>
                <td className="text-muted text-[12px]">
                  {(s.fields as FieldDef[]).map((f) => `${f.label} (${f.type})`).join(", ") || "—"}
                </td>
                <td>
                  <Button onClick={() => startEdit(s)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Page>
  );
}

export const dynamic = "force-dynamic";
