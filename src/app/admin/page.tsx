"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, LinkButton, Page, PageHeader, Section } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

const TRAIL = [TRAIL_ROOTS.admin];

const tools = [
  ["users", "/admin/users"],
  ["spaces", "/admin/categories"],
  ["tags", "/admin/tags"],
  ["redirects", "/admin/redirects"],
  ["modules", "/admin/modules"],
  ["starter kits", "/admin/kits"],
  ["import", "/import"],
  ["maintenance", "/admin/maintenance"],
  ["read-only mode", "/admin/read-only"],
  ["audit log", "/admin/audit-log"],
] as const;

export default function AdminPage() {
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/check")
      .then((response) => response.json())
      .then((result) => setAdmin(Boolean(result.admin)))
      .catch(() => setAdmin(false));
  }, []);

  return (
    <Page trail={TRAIL}>
      <PageHeader title="admin" description="the small set of controls required to operate this wiki." />

      {admin === null ? (
        <p className="text-[13px] text-muted">loading...</p>
      ) : !admin ? (
        <EmptyState
          title="admin access required"
          description="log in as an administrator to continue."
          actions={<LinkButton href="/login" variant="primary">log in</LinkButton>}
        />
      ) : (
        <Section title="operations">
          <ul className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {tools.map(([label, href]) => (
              <li key={href} className="bg-surface">
                <Link href={href} className="block px-4 py-3 text-[13px] hover:bg-surface-hover">{label}</Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Page>
  );
}
