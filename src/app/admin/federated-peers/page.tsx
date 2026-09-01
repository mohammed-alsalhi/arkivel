"use client";

import { useState, useEffect } from "react";
import { Button, DataTable, EmptyState, Page, PageHeader, SectionPanel } from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";

type Peer = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string | null;
  enabled: boolean;
};

export default function FederatedPeersPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Peer | null>(null);
  const [form, setForm] = useState({ name: "", baseUrl: "", apiKey: "", enabled: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/federated-peers");
    const data = await res.json();
    if (Array.isArray(data)) setPeers(data);
    setLoading(false);
  }

  function startCreate() {
    setForm({ name: "", baseUrl: "", apiKey: "", enabled: true });
    setEditing(null);
    setCreating(true);
    setError("");
  }

  function startEdit(p: Peer) {
    setForm({ name: p.name, baseUrl: p.baseUrl, apiKey: p.apiKey ?? "", enabled: p.enabled });
    setEditing(p);
    setCreating(false);
    setError("");
  }

  async function save() {
    setSaving(true);
    setError("");
    const url = editing ? `/api/federated-peers/${editing.id}` : "/api/federated-peers";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed to save"); return; }
    setEditing(null);
    setCreating(false);
    load();
  }

  async function deletePeer(id: string) {
    if (!(await confirm("Remove this federated peer?", { title: "Remove peer", confirmLabel: "Remove", danger: true }))) return;
    await fetch(`/api/federated-peers/${id}`, { method: "DELETE" });
    load();
  }

  async function toggleEnabled(p: Peer) {
    await fetch(`/api/federated-peers/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, enabled: !p.enabled }),
    });
    load();
  }

  return (
    <Page>
      <PageHeader
        title="Federated search peers"
        description={
          <>
            Configure external wiki instances to include in federated search results. Peer wikis must expose the public{" "}
            <code className="bg-surface-hover px-1 rounded text-[12px]">/api/v1/articles</code> endpoint.
            Results appear in the search page under &ldquo;Results from other wikis&rdquo;.
          </>
        }
        actions={<Button onClick={startCreate}>+ Add peer</Button>}
      />

      {(creating || editing) && (
        <SectionPanel
          className="mb-4"
          title={editing ? `Edit: ${editing.name}` : "Add federated peer"}
          bodyClassName="space-y-2"
        >
            <div>
              <label className="block text-[11px] text-muted font-bold mb-0.5">Display name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border bg-surface px-2 py-1 text-[12px] focus:border-accent focus:outline-none" placeholder="My Other Wiki" />
            </div>
            <div>
              <label className="block text-[11px] text-muted font-bold mb-0.5">Base URL</label>
              <input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                className="w-full border border-border bg-surface px-2 py-1 text-[12px] font-mono focus:border-accent focus:outline-none" placeholder="https://otherwiki.example.com" />
            </div>
            <div>
              <label className="block text-[11px] text-muted font-bold mb-0.5">API key (optional, for private wikis)</label>
              <input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                className="w-full border border-border bg-surface px-2 py-1 text-[12px] font-mono focus:border-accent focus:outline-none" placeholder="Leave blank for public wikis" />
            </div>
            <label className="flex items-center gap-1.5 text-[12px] pointer-coarse:py-2">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="pointer-coarse:h-5 pointer-coarse:w-5" />
              Enabled
            </label>
            {error && <p className="text-[12px] text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button variant="primary" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button onClick={() => { setEditing(null); setCreating(false); }}>
                Cancel
              </Button>
            </div>
        </SectionPanel>
      )}

      {loading ? (
        <p className="text-[13px] text-muted italic">Loading…</p>
      ) : peers.length === 0 ? (
        <EmptyState title="No federated peers configured yet." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th className="w-20">Status</th>
              <th className="w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.name}</td>
                <td className="text-muted text-[12px] font-mono">{p.baseUrl}</td>
                <td>
                  <Button aria-pressed={p.enabled} onClick={() => toggleEnabled(p)}>
                    {p.enabled ? "Active" : "Off"}
                  </Button>
                </td>
                <td>
                  <span className="flex gap-1">
                    <Button onClick={() => startEdit(p)}>Edit</Button>
                    <Button variant="danger" onClick={() => deletePeer(p.id)}>Del</Button>
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
