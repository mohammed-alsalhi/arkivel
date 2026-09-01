"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/AdminContext";
import { Button, DataTable, SectionPanel } from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";

type Tag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  parentId: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  children?: Tag[];
  _count?: { articles: number };
};

export default function TagManager() {
  const { confirm, confirmDialog } = useConfirm();
  const isAdmin = useAdmin();
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    const data = await fetch("/api/tags").then((r) => r.json());
    setTags(data);
  }

  if (!isAdmin) return null;

  // Build flat list from tree for display
  const rootTags = tags.filter((t) => !t.parentId);
  const flatTags = flattenTree(rootTags, tags);

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color || "");
    setParentId(tag.parentId || "");
    setError("");
    setSuccess("");
    setShowCreate(false);
  }

  function startCreate() {
    setEditingId(null);
    setName("");
    setColor("");
    setParentId("");
    setError("");
    setSuccess("");
    setShowCreate(true);
  }

  function cancelForm() {
    setEditingId(null);
    setShowCreate(false);
    setError("");
    setSuccess("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (editingId) {
      const res = await fetch(`/api/tags/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color: color.trim() || null,
          parentId: parentId || null,
        }),
      });

      if (res.ok) {
        setSuccess("Tag updated!");
        setEditingId(null);
        router.refresh();
        fetchTags();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update tag");
      }
    } else {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color: color.trim() || null,
          parentId: parentId || null,
        }),
      });

      if (res.ok) {
        setSuccess("Tag created!");
        setName("");
        setColor("");
        setParentId("");
        setShowCreate(false);
        router.refresh();
        fetchTags();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create tag");
      }
    }
  }

  async function handleDelete(tag: Tag) {
    const articleCount = tag._count?.articles || 0;
    if (articleCount > 0) {
      setError(`"${tag.name}" has ${articleCount} article(s). Remove tag from articles before deleting.`);
      return;
    }

    if (!(await confirm(`Delete "${tag.name}"? This cannot be undone.`, { title: "Delete tag", confirmLabel: "Delete", danger: true }))) return;

    setError("");
    const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
    if (res.ok) {
      setSuccess(`"${tag.name}" deleted.`);
      router.refresh();
      fetchTags();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete tag");
    }
  }

  const presetColors = ["#36c", "#2a7", "#c33", "#e90", "#808", "#069", "#666", "#333"];

  return (
    <SectionPanel className="max-w-2xl" title="Manage Tags">
        {/* Tag list with edit/delete controls */}
        <DataTable className="text-[13px] mb-3">
          <thead>
            <tr className="text-[11px]">
              <th>Tag</th>
              <th>Color</th>
              <th className="text-center">Articles</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {flatTags.map(({ tag, depth }) => (
              <tr key={tag.id}>
                <td style={{ paddingLeft: `${12 + depth * 16}px` }}>
                  {depth > 0 && <span className="text-muted text-[11px] mr-1">{"\u2514"}</span>}
                  {tag.name}
                </td>
                <td>
                  {tag.color ? (
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="inline-block w-3 h-3 rounded-full border border-border-light"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-[11px] text-muted">{tag.color}</span>
                    </span>
                  ) : (
                    <span className="text-muted text-[12px]">{"\u2014"}</span>
                  )}
                </td>
                <td className="text-center text-muted">
                  {tag._count?.articles ?? 0}
                </td>
                <td className="text-right">
                  <button
                    onClick={() => startEdit(tag)}
                    className="text-[11px] text-accent hover:underline mr-2 pointer-coarse:py-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tag)}
                    className="text-[11px] text-wiki-link-broken hover:underline pointer-coarse:py-2"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {flatTags.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted text-[12px] italic">
                  No tags yet.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>

        {/* Success/error messages */}
        {error && <p className="text-[12px] text-wiki-link-broken mb-2">{error}</p>}
        {success && !editingId && !showCreate && (
          <p className="text-[12px] text-accent mb-2">{success}</p>
        )}

        {/* Create/Edit form */}
        {(showCreate || editingId) ? (
          <form onSubmit={handleSave} className="border-t border-border pt-3 space-y-2">
            <div className="text-[12px] font-bold text-heading mb-1">
              {editingId ? "Edit Tag" : "New Tag"}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[11px] text-muted mb-0.5">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border border-border bg-surface px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] text-muted mb-0.5">Parent</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full border border-border bg-surface px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="">None (top-level)</option>
                  {flatTags
                    .filter(({ tag }) => tag.id !== editingId)
                    .map(({ tag, depth }) => (
                      <option key={tag.id} value={tag.id}>
                        {"\u00A0".repeat(depth * 4)}
                        {depth > 0 ? "\u2514 " : ""}
                        {tag.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-0.5">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#36c"
                  className="w-24 border border-border bg-surface px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
                />
                <div className="flex gap-1">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-5 h-5 rounded-full border border-border-light hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                {color && (
                  <span
                    className="inline-block w-5 h-5 rounded-full border border-border-light"
                    style={{ backgroundColor: color }}
                  />
                )}
              </div>
            </div>
            {error && (showCreate || editingId) && (
              <p className="text-[12px] text-wiki-link-broken">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="primary">
                {editingId ? "Save" : "Create"}
              </Button>
              <Button type="button" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={startCreate} variant="primary">
            + New Tag
          </Button>
        )}
      {confirmDialog}
    </SectionPanel>
  );
}

function flattenTree(
  rootTags: Tag[],
  allTags: Tag[],
  depth = 0
): { tag: Tag; depth: number }[] {
  return rootTags.flatMap((tag) => {
    const children = allTags.filter((t) => t.parentId === tag.id);
    return [
      { tag, depth },
      ...flattenTree(children, allTags, depth + 1),
    ];
  });
}
