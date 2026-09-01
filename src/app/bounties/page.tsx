"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, EmptyState, Page, PageHeader, TabButton, Tabs } from "@/components/ui";

interface Bounty {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  requester: { username: string; displayName: string | null };
  claimer: { username: string; displayName: string | null } | null;
  article: { title: string; slug: string } | null;
}

export default function BountiesPage() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showForm, setShowForm] = useState(false);

  function load(status: string) {
    setLoading(true);
    fetch(`/api/bounties?status=${status}`)
      .then((r) => r.json())
      .then((data) => { setBounties(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(filter); }, [filter]);

  async function claim(id: string) {
    await fetch(`/api/bounties/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "claim" }),
    });
    load(filter);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await fetch("/api/bounties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDesc }),
    });
    setNewTitle(""); setNewDesc(""); setShowForm(false);
    load(filter);
  }

  const statusColors: Record<string, string> = {
    open: "text-success",
    claimed: "text-warning",
    fulfilled: "text-info",
    closed: "text-muted",
  };

  return (
    <Page>
      <PageHeader
        title="Knowledge Bounties"
        actions={
          <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
            Request an article
          </Button>
        }
      />
      <div>

        {showForm && (
          <form onSubmit={submit} className="border border-border rounded p-3 mb-4 space-y-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Article topic you want written"
              className="w-full border border-border rounded px-3 py-1.5 text-sm bg-transparent"
              required
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Why is this article needed? (optional)"
              className="w-full border border-border rounded px-3 py-1.5 text-sm bg-transparent resize-none"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Submit Request</Button>
            </div>
          </form>
        )}

        {/* Status filter tabs */}
        <Tabs label="Bounty status" className="mb-4">
          {["open", "claimed", "fulfilled", "closed"].map((s) => (
            <TabButton
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </TabButton>
          ))}
        </Tabs>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : bounties.length === 0 ? (
          <EmptyState title={`No ${filter} bounties.`} />
        ) : (
          <div className="space-y-2">
            {bounties.map((b) => (
              <div key={b.id} className="border border-border rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{b.title}</p>
                    {b.description && <p className="text-xs text-muted mt-0.5">{b.description}</p>}
                    {b.article && (
                      <p className="text-xs mt-1">
                        Fulfilled:{" "}
                        <Link href={`/articles/${b.article.slug}`} className="text-wiki-link hover:underline">
                          {b.article.title}
                        </Link>
                      </p>
                    )}
                    <p className="text-[10px] text-muted mt-1">
                      Requested by {b.requester.displayName || b.requester.username}
                      {b.claimer && ` • Claimed by ${b.claimer.displayName || b.claimer.username}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] uppercase font-semibold ${statusColors[b.status] || "text-muted"}`}>
                      {b.status}
                    </span>
                    {b.status === "open" && (
                      <button onClick={() => claim(b.id)} className="text-xs text-wiki-link hover:underline">
                        Claim
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
