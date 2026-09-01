"use client";

import { useEffect, useState } from "react";
import { Button, DataTable, EmptyState, Page, PageHeader } from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";
import { useToast } from "@/components/Toast";

export const dynamic = "force-dynamic";

type Tag = { id: string; name: string; slug: string; color: string | null; _count?: { articles: number } };

export default function AdminTagsPage() {
  const { confirm, confirmDialog } = useConfirm();
  const { addToast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    const res = await fetch("/api/tags?limit=500");
    if (res.ok) {
      const data = await res.json();
      setTags(Array.isArray(data) ? data : (data.tags ?? []));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(tag: Tag) {
    setEditId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color ?? "");
    setError("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditColor("");
    setError("");
  }

  async function saveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/tags/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor || null }),
    });
    if (res.ok) {
      const updated: Tag = await res.json();
      setTags((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      cancelEdit();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
    }
    setSaving(false);
  }

  async function deleteTag(tag: Tag) {
    if (!(await confirm(`Delete tag "${tag.name}"? This will remove it from all articles.`, { title: "Delete tag", confirmLabel: "Delete", danger: true }))) return;
    const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } else {
      const body = await res.json().catch(() => ({}));
      addToast(body.error ?? "Failed to delete tag", "error");
    }
  }

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Page>
      <PageHeader title="Tag management" />

      <div className="mb-4 flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter tags…"
          className="text-[13px] bg-transparent border border-border rounded px-2 py-1 outline-none focus:border-[var(--color-accent)] text-foreground placeholder:text-muted w-64"
        />
        <span className="text-[12px] text-muted">{filtered.length} tag{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <p className="text-muted text-[13px]">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState title="No tags found." />
      ) : (
        <DataTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Color</th>
                <th>Articles</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tag) => (
                <tr key={tag.id} className="group">
                  {editId === tag.id ? (
                    <>
                      <td colSpan={3}>
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="text-[13px] bg-transparent border border-border rounded px-2 py-0.5 outline-none focus:border-[var(--color-accent)] text-foreground w-40"
                          />
                          <input
                            type="color"
                            value={editColor || "#888888"}
                            onChange={(e) => setEditColor(e.target.value)}
                            title="Tag color"
                            className="w-7 h-6 pointer-coarse:w-9 pointer-coarse:h-9 rounded border border-border cursor-pointer"
                          />
                          <button
                            onClick={() => setEditColor("")}
                            className="text-[11px] text-muted hover:text-foreground pointer-coarse:py-2 pointer-coarse:px-2"
                            title="Clear color"
                          >
                            Clear
                          </button>
                          {error && <span className="text-danger text-[11px]">{error}</span>}
                        </div>
                      </td>
                      <td className="text-muted">{tag._count?.articles ?? "—"}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button onClick={saveEdit} disabled={saving}>
                            Save
                          </Button>
                          <Button onClick={cancelEdit}>Cancel</Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="font-medium">
                        <div className="flex items-center gap-2">
                          {tag.color && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: tag.color }}
                            />
                          )}
                          {tag.name}
                        </div>
                      </td>
                      <td className="text-muted font-mono text-[11px]">{tag.slug}</td>
                      <td className="text-muted">{tag.color || <span className="opacity-40 italic">none</span>}</td>
                      <td className="text-muted">{tag._count?.articles ?? "—"}</td>
                      <td>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button onClick={() => startEdit(tag)}>Rename</Button>
                          <Button variant="danger" onClick={() => deleteTag(tag)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
        </DataTable>
      )}
      {confirmDialog}
    </Page>
  );
}
