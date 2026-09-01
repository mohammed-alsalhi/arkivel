"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/AdminContext";
import { Button, DataTable, SectionPanel } from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  parentId?: string | null;
  children?: Category[];
  _count?: { articles: number };
};

export default function CategoryManager() {
  const { confirm, confirmDialog } = useConfirm();
  const isAdmin = useAdmin();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const data = await fetch("/api/categories").then((r) => r.json());
    setCategories(data);
  }

  if (!isAdmin) return null;

  const flatCategories = flattenTree(categories.filter((c) => !c.parentId));

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setCoverImage(cat.coverImage || "");
    setParentId(cat.parentId || "");
    setError("");
    setSuccess("");
    setShowCreate(false);
  }

  function startCreate() {
    setEditingId(null);
    setName("");
    setDescription("");
    setCoverImage("");
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
      // Update
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          coverImage: coverImage.trim() || null,
          parentId: parentId || null,
        }),
      });

      if (res.ok) {
        setSuccess("Category updated!");
        setEditingId(null);
        router.refresh();
        fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update category");
      }
    } else {
      // Create
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          coverImage: coverImage.trim() || null,
          parentId: parentId || null,
        }),
      });

      if (res.ok) {
        setSuccess("Category created!");
        setName("");
        setDescription("");
        setParentId("");
        setShowCreate(false);
        router.refresh();
        fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create category");
      }
    }
  }

  async function handleDelete(cat: Category) {
    const articleCount = cat._count?.articles || 0;
    const msg = articleCount > 0
      ? `"${cat.name}" has ${articleCount} article(s). Reassign them before deleting.`
      : `Delete "${cat.name}"? This cannot be undone.`;

    if (articleCount > 0) {
      setError(msg);
      return;
    }

    if (!(await confirm(msg, { title: "Delete category", confirmLabel: "Delete", danger: true }))) return;

    setError("");
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) {
      setSuccess(`"${cat.name}" deleted.`);
      router.refresh();
      fetchCategories();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete category");
    }
  }

  return (
    <SectionPanel className="max-w-2xl" title="Manage Categories">
        {/* Category list with edit/delete controls */}
        <DataTable className="text-[13px] mb-3">
          <thead>
            <tr className="text-[11px]">
              <th>Category</th>
              <th>Description</th>
              <th className="text-center">Articles</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {flatCategories.map(({ category, depth }) => (
              <tr key={category.id}>
                <td style={{ paddingLeft: `${12 + depth * 16}px` }}>
                  {depth > 0 && <span className="text-muted text-[11px] mr-1">{"\u2514"}</span>}
                  {category.name}
                </td>
                <td className="text-muted text-[12px] max-w-48 truncate">
                  {category.description || "\u2014"}
                </td>
                <td className="text-center text-muted">
                  {category._count?.articles ?? 0}
                </td>
                <td className="text-right">
                  <button
                    onClick={() => startEdit(category)}
                    className="text-[11px] text-accent hover:underline mr-2 pointer-coarse:py-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    className="text-[11px] text-wiki-link-broken hover:underline pointer-coarse:py-2"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
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
              {editingId ? "Edit Category" : "New Category"}
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
                  {flatCategories
                    .filter(({ category }) => category.id !== editingId)
                    .map(({ category, depth }) => (
                      <option key={category.id} value={category.id}>
                        {"\u00A0".repeat(depth * 4)}
                        {depth > 0 ? "\u2514 " : ""}
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-0.5">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-border bg-surface px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-0.5">Cover image URL (optional banner)</label>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…"
                className="w-full border border-border bg-surface px-2 py-1 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
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
            + New Category
          </Button>
        )}
      {confirmDialog}
    </SectionPanel>
  );
}

function flattenTree(
  categories: Category[],
  depth = 0
): { category: Category; depth: number }[] {
  return categories.flatMap((cat) => [
    { category: cat, depth },
    ...(cat.children ? flattenTree(cat.children, depth + 1) : []),
  ]);
}
