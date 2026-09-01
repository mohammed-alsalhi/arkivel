"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/AdminContext";
import { Page, PageHeader, TabButton, Tabs } from "@/components/ui";
import { useToast } from "@/components/Toast";

type ChangeRequestArticle = {
  id: string;
  title: string;
  slug: string;
};

type ChangeRequestAuthor = {
  id: string;
  username: string;
  displayName: string | null;
};

type ChangeRequestItem = {
  id: string;
  title: string;
  description: string | null;
  content: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  article: ChangeRequestArticle;
  author: ChangeRequestAuthor;
};

type TabKey = "open" | "accepted" | "rejected";

const STATUS_MAP: Record<TabKey, string> = {
  open: "open",
  accepted: "accepted",
  rejected: "rejected",
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-warning-soft text-warning border border-warning-border",
    accepted: "bg-success-soft text-success border border-success-border",
    rejected: "bg-danger-soft text-danger border border-danger-border",
    withdrawn: "bg-surface-hover text-muted border border-border",
  };

  const labels: Record<string, string> = {
    open: "Open",
    accepted: "Accepted",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };

  const cls = styles[status] ?? "bg-surface-hover text-muted border border-border";
  const label = labels[status] ?? status;

  return (
    <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${cls}`}>
      {label}
    </span>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ChangeRequestsPage() {
  const { addToast } = useToast();
  const isAdmin = useAdmin();
  const [activeTab, setActiveTab] = useState<TabKey>("open");
  const [items, setItems] = useState<ChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/change-requests?status=${encodeURIComponent(status)}`);
      if (!res.ok) throw new Error("Failed to load change requests");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load change requests");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(STATUS_MAP[activeTab]);
  }, [activeTab, fetchItems]);

  async function handleStatusChange(
    id: string,
    status: "accepted" | "rejected"
  ) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/change-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Action failed");
      }
      // Refresh the list
      await fetchItems(STATUS_MAP[activeTab]);
      // Collapse if was expanded
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "accepted", label: "Accepted" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <Page>
      <PageHeader title="Change Requests" />

      <Tabs label="Change request status" className="mb-4">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </TabButton>
        ))}
      </Tabs>

      {/* Content */}
      {loading ? (
        <p className="text-[13px] text-muted italic">Loading...</p>
      ) : error ? (
        <p className="text-[13px] text-danger">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-muted italic">
          No {activeTab} change requests.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            const isActioning = actionLoading === item.id;

            return (
              <div
                key={item.id}
                className="border border-border bg-surface"
              >
                {/* Row header — clickable to expand */}
                <div
                  className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-hover transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : item.id)
                  }
                >
                  {/* Expand indicator */}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 text-muted transition-transform ${isExpanded ? "" : "-rotate-90"}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="text-[12px] text-muted ml-2">
                      on{" "}
                      <Link
                        href={`/articles/${item.article.slug}`}
                        className="text-accent hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.article.title}
                      </Link>
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={item.status} />
                    <span className="text-[11px] text-muted">
                      {item.author.displayName || item.author.username}
                    </span>
                    <span className="text-[11px] text-muted">
                      {formatDate(item.createdAt)}
                    </span>

                    {/* Accept / Reject buttons for editors/admins on open requests */}
                    {isAdmin && item.status === "open" && (
                      <>
                        <button
                          disabled={isActioning}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(item.id, "accepted");
                          }}
                          className="px-2 py-0.5 text-[11px] bg-success-soft text-success border border-success-border hover:border-success transition-colors disabled:opacity-50"
                        >
                          {isActioning ? "..." : "Accept"}
                        </button>
                        <button
                          disabled={isActioning}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(item.id, "rejected");
                          }}
                          className="px-2 py-0.5 text-[11px] bg-danger-soft text-danger border border-danger-border hover:border-danger transition-colors disabled:opacity-50"
                        >
                          {isActioning ? "..." : "Reject"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded description */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 bg-surface">
                    {item.description ? (
                      <p className="text-[13px] text-foreground whitespace-pre-wrap mb-2">
                        {item.description}
                      </p>
                    ) : (
                      <p className="text-[13px] text-muted italic mb-2">
                        No description provided.
                      </p>
                    )}

                    {item.reviewNote && (
                      <div className="mt-2 p-2 bg-warning-soft border border-warning-border text-[12px] text-warning">
                        <span className="font-semibold">Review note:</span>{" "}
                        {item.reviewNote}
                      </div>
                    )}

                    {item.status === "withdrawn" && (
                      <div className="mt-2">
                        <StatusBadge status="withdrawn" />
                      </div>
                    )}

                    <div className="mt-2 text-[11px] text-muted">
                      Proposed content:{" "}
                      <span className="font-mono">
                        {item.content.length} characters
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
