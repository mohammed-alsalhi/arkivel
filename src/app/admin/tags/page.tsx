"use client";

import { useEffect, useState } from "react";
import { Button, DataTable, EmptyState, Input, LinkButton, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TRAIL = [TRAIL_ROOTS.admin, { label: "tags" }];

type Tag = { id: string; name: string; slug: string; color: string | null; _count?: { articles: number } };

export default function AdminTagsPage() {
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
      setError(body.error ?? "could not save the tag. try again.");
    }
    setSaving(false);
  }

  async function deleteTag(tag: Tag) {
    if (!confirm(`delete tag "${tag.name}"? this will remove it from all pages.`)) return;
    const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "could not delete the tag. try again.");
    }
  }

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Page trail={TRAIL}>
      <PageHeader title="tags" description="rename, recolor, or delete the tags used across pages." />

      <div className="mb-4 flex items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filter tags…"
          className="w-64"
        />
        <span className="text-[12px] text-muted">{plural(filtered.length, "tag", "tags")}</span>
      </div>

      {loading ? (
        <p className="text-muted text-[13px]">loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="no tags found"
          description={search ? "no tags match this filter." : "tags are created when you add them to a page."}
          actions={search ? undefined : <LinkButton href="/articles/new">new page</LinkButton>}
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>name</th>
              <th>slug</th>
              <th>color</th>
              <th>pages</th>
              <th>actions</th>
            </tr>
          </thead>
          <tbody>
              {filtered.map((tag) => (
                <tr key={tag.id} className="group">
                  {editId === tag.id ? (
                    <>
                      <td colSpan={3}>
                        <div className="flex items-center gap-2">
                          <Input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="w-40"
                          />
                          <input
                            type="color"
                            value={editColor || "#888888"}
                            onChange={(e) => setEditColor(e.target.value)}
                            title="tag color"
                            className="w-7 h-6 rounded border border-border cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => setEditColor("")}
                            className="text-[11px] text-muted hover:text-foreground"
                            title="clear color"
                          >
                            clear
                          </button>
                          {error && <span className="text-danger text-[11px]">{error}</span>}
                        </div>
                      </td>
                      <td className="text-muted">{tag._count?.articles ?? "—"}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button onClick={saveEdit} disabled={saving}>
                            save
                          </Button>
                          <Button onClick={cancelEdit}>cancel</Button>
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
                      <td className="text-muted">{tag.color || <span className="italic">none</span>}</td>
                      <td className="text-muted">{tag._count?.articles ?? "—"}</td>
                      <td>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button onClick={() => startEdit(tag)}>rename</Button>
                          <Button variant="danger" onClick={() => deleteTag(tag)}>
                            delete
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
    </Page>
  );
}
