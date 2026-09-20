"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/AdminContext";
import { DataTable, Input, Select } from "@/components/ui";
import { plural } from "@/lib/utils";

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
      setError("name is required");
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
        setSuccess("space updated");
        setEditingId(null);
        router.refresh();
        fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || "unable to update space. try again.");
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
        setSuccess("space created");
        setName("");
        setDescription("");
        setParentId("");
        setShowCreate(false);
        router.refresh();
        fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || "unable to create space. try again.");
      }
    }
  }

  async function handleDelete(cat: Category) {
    const articleCount = cat._count?.articles || 0;
    const msg = articleCount > 0
      ? `"${cat.name}" has ${articleCount} ${plural(articleCount, "page", "pages")}. move them to another space before deleting.`
      : `delete "${cat.name}"? the space is removed permanently.`;

    if (articleCount > 0) {
      setError(msg);
      return;
    }

    if (!confirm(msg)) return;

    setError("");
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) {
      setSuccess(`"${cat.name}" deleted.`);
      router.refresh();
      fetchCategories();
    } else {
      const data = await res.json();
      setError(data.error || "unable to delete space. try again.");
    }
  }

  return (
    <div className="wiki-portal max-w-2xl">
      <div className="wiki-portal-header">manage spaces</div>
      <div className="wiki-portal-body">
        {/* Category list with edit/delete controls */}
        <DataTable className="mb-3">
          <thead>
            <tr>
              <th>space</th>
              <th>description</th>
              <th className="text-center">pages</th>
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
                    type="button"
                    onClick={() => startEdit(category)}
                    className="text-[11px] text-accent hover:underline mr-2"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    className="text-[11px] text-danger hover:underline"
                  >
                    delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        {/* Success/error messages */}
        {error && <p className="text-[12px] text-danger mb-2">{error}</p>}
        {success && !editingId && !showCreate && (
          <p className="text-[12px] text-accent mb-2">{success}</p>
        )}

        {/* Create/Edit form */}
        {(showCreate || editingId) ? (
          <form onSubmit={handleSave} className="border-t border-border pt-3 space-y-2">
            <div className="text-[12px] font-bold text-heading mb-1">
              {editingId ? "edit space" : "new space"}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="category-name" className="block text-[11px] text-muted mb-0.5">name *</label>
                <Input
                  id="category-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <label htmlFor="category-parent" className="block text-[11px] text-muted mb-0.5">parent</label>
                <Select
                  id="category-parent"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">none (top-level)</option>
                  {flatCategories
                    .filter(({ category }) => category.id !== editingId)
                    .map(({ category, depth }) => (
                      <option key={category.id} value={category.id}>
                        {"\u00A0".repeat(depth * 4)}
                        {depth > 0 ? "\u2514 " : ""}
                        {category.name}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
            <div>
              <label htmlFor="category-description" className="block text-[11px] text-muted mb-0.5">description</label>
              <Input
                id="category-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="category-cover-image" className="block text-[11px] text-muted mb-0.5">cover image url (optional banner)</label>
              <Input
                id="category-cover-image"
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…"
              />
            </div>
            {error && (showCreate || editingId) && (
              <p className="text-[12px] text-danger">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-accent px-3 py-1 text-[13px] font-bold text-accent-foreground hover:bg-accent-hover"
              >
                {editingId ? "save" : "create"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-3 py-1 text-[13px] text-muted border border-border hover:bg-surface-hover"
              >
                cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={startCreate}
            className="bg-accent px-3 py-1 text-[13px] font-bold text-accent-foreground hover:bg-accent-hover"
          >
            + new space
          </button>
        )}
      </div>
    </div>
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
