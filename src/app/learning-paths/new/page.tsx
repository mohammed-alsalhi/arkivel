"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Page, PageHeader } from "@/components/ui";

export default function NewLearningPathPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/learning-paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, isPublic }),
      });
      if (!res.ok) throw new Error(await res.text());
      const path = await res.json();
      router.push(`/learning-paths/${path.id}`);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  return (
    <Page width="narrow">
      <PageHeader title="New Learning Path" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-surface"
            placeholder="e.g. Getting Started Guide"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-surface"
            rows={3} placeholder="Optional description"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Make this path public
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit" disabled={saving}
          className="ui-button ui-button-primary"
        >
          {saving ? "Creating…" : "Create Path"}
        </button>
      </form>
    </Page>
  );
}
