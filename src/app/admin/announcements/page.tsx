"use client";

import { useState, useEffect } from "react";
import { Button, DataTable, EmptyState, Page, PageHeader, SectionPanel } from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";

type Announcement = {
  id: string;
  message: string;
  type: string;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
};

const TYPES = ["info", "warning", "success", "error"] as const;

const TYPE_BADGE: Record<string, string> = {
  info:    "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  error:   "bg-danger-soft text-danger",
};

export default function AnnouncementsPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("info");
  const [expiresAt, setExpiresAt] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/announcements");
    if (res.ok) setList(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, type, expiresAt: expiresAt || null, scheduledAt: scheduledAt || null }),
    });
    if (res.ok) {
      setMessage("");
      setExpiresAt("");
      setScheduledAt("");
      setType("info");
      await load();
    }
    setSaving(false);
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    await load();
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Delete this announcement?", { title: "Delete announcement", confirmLabel: "Delete", danger: true }))) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <Page>
      <PageHeader title="Announcements" />

      {/* Create form */}
      <SectionPanel className="mb-6" title="New announcement">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-[12px] text-muted mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="w-full border border-border bg-background px-2 py-1.5 text-[13px] text-foreground focus:border-accent focus:outline-none resize-none"
              placeholder="Announcement text shown to all users…"
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-[12px] text-muted mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
                className="border border-border bg-background px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-muted mb-1">Expires (optional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="border border-border bg-background px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted mb-1">Go live at (optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="border border-border bg-background px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div className="self-end">
              <Button type="submit" variant="primary" disabled={saving || !message.trim()}>
                {saving ? "Posting…" : "Post announcement"}
              </Button>
            </div>
          </div>
        </form>
      </SectionPanel>

      {/* List */}
      {loading ? (
        <div className="text-muted text-[13px] italic">Loading…</div>
      ) : list.length === 0 ? (
        <EmptyState title="No announcements yet." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Message</th>
              <th>Type</th>
              <th>Expires</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td className="max-w-xs">
                  <span className={a.active ? "" : "opacity-50 line-through"}>{a.message}</span>
                </td>
                <td>
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${TYPE_BADGE[a.type] ?? ""}`}>
                    {a.type}
                  </span>
                </td>
                <td className="text-muted">
                  {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : "—"}
                </td>
                <td>
                  <Button aria-pressed={a.active} onClick={() => toggleActive(a.id, a.active)}>
                    {a.active ? "Active" : "Inactive"}
                  </Button>
                </td>
                <td className="text-right">
                  <Button onClick={() => handleDelete(a.id)}>Delete</Button>
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
