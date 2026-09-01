"use client";

import { useState, useEffect } from "react";
import {
  Button,
  DataTable,
  EmptyState,
  Field,
  InlineCode,
  Input,
  Page,
  PageHeader,
  SectionPanel,
  Textarea,
} from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";

type Snippet = { id: string; name: string; content: string; createdAt: string };

export default function SnippetsPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/snippets");
    if (res.ok) setSnippets(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    const url = editId ? `/api/snippets/${editId}` : "/api/snippets";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content }),
    });
    if (res.ok) {
      setName("");
      setContent("");
      setEditId(null);
      await load();
    }
    setSaving(false);
  }

  function startEdit(s: Snippet) {
    setEditId(s.id);
    setName(s.name);
    setContent(s.content);
  }

  function cancelEdit() {
    setEditId(null);
    setName("");
    setContent("");
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Delete this snippet?", { title: "Delete snippet", confirmLabel: "Delete", danger: true }))) return;
    await fetch(`/api/snippets/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <Page>
      <PageHeader
        title="Editor Snippets"
        description={
          <>
            Snippets are reusable content blocks. Type <InlineCode>/snippet</InlineCode> in the
            editor to insert one.
          </>
        }
      />

      <SectionPanel className="mb-6" title={editId ? "Edit snippet" : "New snippet"}>
        <form onSubmit={handleSave} className="space-y-3">
          <Field
            htmlFor="snippet-name"
            label={
              <>
                Name <span className="text-muted">(used as trigger in /snippet menu)</span>
              </>
            }
          >
            <Input
              id="snippet-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-xs"
              placeholder="e.g. meeting-notes, warning-box"
            />
          </Field>
          <Field htmlFor="snippet-content" label="Content (HTML)">
            <Textarea
              id="snippet-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="font-mono"
              placeholder="<p>Your snippet content here…</p>"
            />
          </Field>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={saving || !name.trim() || !content.trim()}
              variant="primary"
              className="disabled:opacity-40"
            >
              {saving ? "Saving…" : editId ? "Update" : "Create snippet"}
            </Button>
            {editId && (
              <Button
                type="button"
                onClick={cancelEdit}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </SectionPanel>

      {loading ? (
        <div className="text-muted text-[13px] italic">Loading…</div>
      ) : snippets.length === 0 ? (
        <EmptyState
          title="No snippets yet"
          description="Create a reusable block above to make it available in the editor."
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Preview</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {snippets.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-[12px] text-accent">{s.name}</td>
                <td className="max-w-xs text-muted truncate text-[12px]">
                  {s.content.replace(/<[^>]+>/g, " ").trim().slice(0, 80)}
                </td>
                <td className="text-right">
                  <span className="inline-flex gap-1">
                    <Button
                      onClick={() => startEdit(s)}
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(s.id)}
                    >
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
