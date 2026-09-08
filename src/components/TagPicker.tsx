"use client";

import { useState, useEffect } from "react";

type Tag = { id: string; name: string; slug: string; color: string | null };

type Props = {
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
};

export default function TagPicker({ selectedTagIds, onChange }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setTags);
  }, []);

  function toggle(id: string) {
    onChange(
      selectedTagIds.includes(id)
        ? selectedTagIds.filter((t) => t !== id)
        : [...selectedTagIds, id]
    );
  }

  async function createTag() {
    if (!newTag.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTag.trim() }),
    });
    if (res.ok) {
      const tag = await res.json();
      setTags((prev) => [...prev, tag]);
      onChange([...selectedTagIds, tag.id]);
      setNewTag("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            aria-pressed={selectedTagIds.includes(tag.id)}
            className={`border px-2 py-0.5 text-[12px] transition-colors pointer-coarse:py-2 ${
              selectedTagIds.includes(tag.id)
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-surface-hover text-foreground hover:border-accent"
            }`}
          >
            {tag.name}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createTag())}
          placeholder="new tag…"
          aria-label="new tag name"
          className="border border-border bg-surface px-2 py-0.5 text-[12px] text-foreground placeholder:text-muted focus:border-accent"
        />
        <button
          type="button"
          onClick={createTag}
          className="border border-border bg-surface-hover px-2 py-0.5 text-[12px] text-foreground hover:bg-surface pointer-coarse:py-2 pointer-coarse:px-3"
        >
          add
        </button>
      </div>
    </div>
  );
}
