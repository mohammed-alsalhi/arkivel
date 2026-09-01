"use client";

import { useState, useEffect } from "react";
import { Button, DataTable, EmptyState, Page, PageHeader, SectionPanel } from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";

type Macro = {
  id: string;
  name: string;
  description: string | null;
  template: string;
  updatedAt: string;
};

const DEFAULT_TEMPLATES: Record<string, { description: string; template: string }> = {
  warning: {
    description: "Yellow warning box",
    template: `<div class="macro-warning" style="border-left:4px solid var(--color-warning);background:var(--color-warning-soft);padding:0.5rem 0.75rem;margin:0.75rem 0;font-size:13px;"><strong>Warning:</strong> {{{body}}}</div>`,
  },
  note: {
    description: "Blue info box",
    template: `<div class="macro-note" style="border-left:4px solid var(--color-info);background:var(--color-info-soft);padding:0.5rem 0.75rem;margin:0.75rem 0;font-size:13px;"><strong>Note:</strong> {{{body}}}</div>`,
  },
  tip: {
    description: "Green tip box",
    template: `<div class="macro-tip" style="border-left:4px solid var(--color-success);background:var(--color-success-soft);padding:0.5rem 0.75rem;margin:0.75rem 0;font-size:13px;"><strong>Tip:</strong> {{{body}}}</div>`,
  },
};

export default function MacrosPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Macro | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", template: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/macros");
    const data = await res.json();
    if (Array.isArray(data)) setMacros(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startCreate(preset?: string) {
    const p = preset ? DEFAULT_TEMPLATES[preset] : null;
    setForm({ name: preset ?? "", description: p?.description ?? "", template: p?.template ?? "" });
    setEditing(null);
    setCreating(true);
    setError("");
  }

  function startEdit(m: Macro) {
    setForm({ name: m.name, description: m.description ?? "", template: m.template });
    setEditing(m);
    setCreating(false);
    setError("");
  }

  async function save() {
    setSaving(true);
    setError("");
    const url = editing ? `/api/macros/${editing.id}` : "/api/macros";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
      return;
    }
    setEditing(null);
    setCreating(false);
    load();
  }

  async function deleteMacro(id: string, name: string) {
    if (!(await confirm(`Delete macro "{{${name}}}"?`, { title: "Delete macro", confirmLabel: "Delete", danger: true }))) return;
    await fetch(`/api/macros/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <Page>
      <PageHeader
        title="Macros / Shortcodes"
        description={
          <>
            Define reusable shortcodes that authors can embed in articles using{" "}
            <code className="bg-surface-hover px-1 rounded text-[12px]">{"{{macroName|arg1}}"}</code>{" "}
            syntax. Template variables: <code className="bg-surface-hover px-1 rounded text-[12px]">{"{{{body}}}"}</code>{" "}
            (first arg), <code className="bg-surface-hover px-1 rounded text-[12px]">{"{{{1}}}"}</code>,{" "}
            <code className="bg-surface-hover px-1 rounded text-[12px]">{"{{{2}}}"}</code>, etc.
          </>
        }
        actions={
          <>
            <Button onClick={() => startCreate()}>+ New macro</Button>
            <span className="text-[11px] text-muted">Quick-add preset:</span>
            {Object.keys(DEFAULT_TEMPLATES).map((k) => (
              <Button key={k} onClick={() => startCreate(k)}>
                {k}
              </Button>
            ))}
          </>
        }
      />

      {/* Form */}
      {(creating || editing) && (
        <SectionPanel
          className="mb-4"
          title={editing ? `Edit macro: ${editing.name}` : "New macro"}
          bodyClassName="space-y-2"
        >
            {!editing && (
              <div>
                <label className="block text-[11px] text-muted font-bold mb-0.5">Name (no spaces)</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                  className="w-full border border-border bg-surface px-2 py-1 text-[12px] focus:border-accent focus:outline-none"
                  placeholder="e.g. warning"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] text-muted font-bold mb-0.5">Description (optional)</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-border bg-surface px-2 py-1 text-[12px] focus:border-accent focus:outline-none"
                placeholder="Brief description"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted font-bold mb-0.5">HTML template</label>
              <textarea
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value })}
                rows={5}
                className="w-full border border-border bg-surface px-2 py-1 text-[11px] font-mono focus:border-accent focus:outline-none"
                placeholder={`<div class="...">{{{body}}}</div>`}
              />
            </div>
            {form.template && (
              <div>
                <p className="text-[11px] text-muted font-bold mb-0.5">Preview (with sample arg)</p>
                <div
                  className="border border-border bg-surface p-2 text-[13px]"
                  dangerouslySetInnerHTML={{
                    __html: form.template
                      .replace(/\{\{\{body\}\}\}/g, "Sample argument")
                      .replace(/\{\{\{1\}\}\}/g, "Sample argument")
                      .replace(/\{\{\{\d+\}\}\}/g, ""),
                  }}
                />
              </div>
            )}
            {error && <p className="text-[12px] text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button onClick={() => { setEditing(null); setCreating(false); }}>
                Cancel
              </Button>
            </div>
        </SectionPanel>
      )}

      {/* Macro list */}
      {loading ? (
        <p className="text-[13px] text-muted italic">Loading…</p>
      ) : macros.length === 0 ? (
        <EmptyState title="No macros defined yet." description="Add one above." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Shortcode</th>
              <th>Description</th>
              <th className="w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {macros.map((m) => (
              <tr key={m.id}>
                <td>
                  <code className="text-[12px] bg-surface-hover px-1 rounded">{`{{${m.name}|…}}`}</code>
                </td>
                <td className="text-muted text-[12px]">
                  {m.description || <span className="italic">—</span>}
                </td>
                <td>
                  <span className="flex gap-1">
                    <Button onClick={() => startEdit(m)}>Edit</Button>
                    <Button variant="danger" onClick={() => deleteMacro(m.id, m.name)}>
                      Delete
                    </Button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {confirmDialog}
    </Page>
  );
}

export const dynamic = "force-dynamic";
