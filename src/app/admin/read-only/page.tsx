"use client";

import { useEffect, useState } from "react";
import { Notice, Page, PageHeader, SectionPanel, ToggleSwitch } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

const TRAIL = [TRAIL_ROOTS.admin, { label: "read-only mode" }];

export default function ReadOnlyPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await fetch("/api/admin/read-only");
        if (!res.ok) throw new Error("Read-only status request failed");
        const data = await res.json();
        if (!cancelled) {
          setEnabled(Boolean(data.enabled));
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("could not load read-only mode status.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/read-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (!res.ok) throw new Error("Read-only status update failed");
      const data = await res.json();
      setEnabled(Boolean(data.enabled));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("could not update read-only mode.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page width="narrow" trail={TRAIL}>
      <PageHeader title="read-only mode" description="pause editing for everyone except admins." />
      <SectionPanel title="editing controls" bodyClassName="space-y-3">
        <p className="text-[13px] text-muted">
          when read-only mode is enabled, non-admin users cannot create, edit, or delete pages.
          a banner is shown at the top of every page. admins are not affected.
        </p>

        <div className="flex items-center gap-3">
          <ToggleSwitch
            aria-label="toggle read-only mode"
            checked={enabled}
            onClick={toggle}
            disabled={loading || saving}
          />
          <span className="text-[13px] text-foreground">
            {loading
              ? "checking read-only mode status…"
              : enabled
                ? "read-only mode is on"
                : "read-only mode is off"}
          </span>
          {saved && <span className="text-[11px] text-muted">saved</span>}
        </div>

        {error && (
          <Notice className="border-danger-border bg-danger-soft text-danger">{error}</Notice>
        )}

        {enabled && (
          <Notice className="border-info-border bg-info-soft text-info">
            visitors cannot edit pages. only admins can make changes.
          </Notice>
        )}
      </SectionPanel>
    </Page>
  );
}

export const dynamic = "force-dynamic";
