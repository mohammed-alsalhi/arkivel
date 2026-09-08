"use client";

import { useState, useEffect } from "react";
import { DataTable, EmptyState, LinkButton, LoadingState, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

const TRAIL = [TRAIL_ROOTS.admin, { label: "users" }];

type User = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: string;
  _count: { articles: number; revisions: number };
};

const ROLES = ["viewer", "editor", "admin"] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function changeRole(userId: string, role: string) {
    setSaving(userId);
    setError("");
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u))
      );
    } else {
      setError("could not update the role. try again.");
    }
    setSaving(null);
  }

  const header = (
    <PageHeader title="users" description="everyone with an account and the role they hold." />
  );

  if (loading) {
    return (
      <Page trail={TRAIL}>
        {header}
        <LoadingState />
      </Page>
    );
  }

  return (
    <Page trail={TRAIL}>
      {header}

      {error && <p className="text-[12px] text-danger mb-3">{error}</p>}

      <DataTable>
        <thead>
          <tr>
            <th>user</th>
            <th>email</th>
            <th className="w-24">pages</th>
            <th className="w-24">edits</th>
            <th className="w-32">joined</th>
            <th className="w-36">role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <div className="font-medium">{user.displayName || user.username}</div>
                <div className="text-[11px] text-muted">@{user.username}</div>
              </td>
              <td className="text-muted">{user.email}</td>
              <td className="text-center">{user._count.articles}</td>
              <td className="text-center">{user._count.revisions}</td>
              <td className="text-muted text-[12px]">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td>
                <select
                  aria-label={`role for ${user.username}`}
                  value={user.role}
                  disabled={saving === user.id}
                  onChange={(e) => changeRole(user.id, e.target.value)}
                  className="border border-border bg-surface px-2 py-0.5 text-[12px] text-foreground focus:border-accent disabled:opacity-50 w-full"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {users.length === 0 && <EmptyState
          title="no users yet"
          description="accounts appear here once people register."
          actions={<LinkButton href="/register">register</LinkButton>}
        />}
    </Page>
  );
}

export const dynamic = "force-dynamic";
