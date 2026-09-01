"use client";

import { useState, useEffect } from "react";
import { Button, DataTable, EmptyState, Page, PageHeader, SectionPanel } from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";

type Term = { id: string; term: string; definition: string; aliases: string[] };

export default function AdminGlossaryPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [aliases, setAliases] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/glossary");
    if (res.ok) setTerms(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;
    setSaving(true);
    const aliasArr = aliases.split(",").map((a) => a.trim()).filter(Boolean);
    const url = editId ? `/api/glossary/${editId}` : "/api/glossary";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term, definition, aliases: aliasArr }),
    });
    if (res.ok) {
      setTerm(""); setDefinition(""); setAliases(""); setEditId(null);
      await load();
    }
    setSaving(false);
  }

  function startEdit(t: Term) {
    setEditId(t.id);
    setTerm(t.term);
    setDefinition(t.definition);
    setAliases(t.aliases.join(", "));
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Delete this term?", { title: "Delete term", confirmLabel: "Delete", danger: true }))) return;
    await fetch(`/api/glossary/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <Page>
      <PageHeader title="Glossary Management" />

      <SectionPanel className="mb-6" title={editId ? "Edit term" : "New term"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted mb-1">Term</label>
              <input value={term} onChange={(e) => setTerm(e.target.value)} required
                className="w-full border border-border bg-background px-2 py-1.5 text-[13px] text-foreground focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-[12px] text-muted mb-1">Aliases (comma-separated)</label>
              <input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="e.g. JS, ECMAScript"
                className="w-full border border-border bg-background px-2 py-1.5 text-[13px] text-foreground focus:border-accent focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-muted mb-1">Definition</label>
            <textarea value={definition} onChange={(e) => setDefinition(e.target.value)} required rows={2}
              className="w-full border border-border bg-background px-2 py-1.5 text-[13px] text-foreground focus:border-accent focus:outline-none resize-none" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : editId ? "Update" : "Add term"}
            </Button>
            {editId && (
              <Button onClick={() => { setEditId(null); setTerm(""); setDefinition(""); setAliases(""); }}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </SectionPanel>

      {loading ? (
        <p className="text-[13px] text-muted italic">Loading…</p>
      ) : terms.length === 0 ? (
        <EmptyState title="No terms yet." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Term</th>
              <th>Aliases</th>
              <th>Definition</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {terms.map((t) => (
              <tr key={t.id}>
                <td className="font-medium">{t.term}</td>
                <td className="text-muted text-[12px]">{t.aliases.join(", ") || "—"}</td>
                <td className="max-w-xs line-clamp-2">{t.definition}</td>
                <td className="text-right space-x-1">
                  <Button onClick={() => startEdit(t)}>Edit</Button>
                  <Button onClick={() => handleDelete(t.id)}>Delete</Button>
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
