"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  DataTable,
  EmptyState,
  InlineCode,
  LinkButton,
  LoadingState,
  Notice,
  Page,
  PageHeader,
  Section,
} from "@/components/ui";
import { useToast } from "@/components/Toast";
import { TRAIL_ROOTS } from "@/lib/trail";
import { plural } from "@/lib/utils";
import type { ApplyKitReport, KitApplyState, KitId, KitStatus } from "@/kits/types";
import type { ModuleId } from "@/modules/types";

const TRAIL = [TRAIL_ROOTS.admin, { label: "starter kits" }];

type KitsState = { enabled: ModuleId[]; kits: KitStatus[] };

const STATUS_TONE: Record<KitApplyState, "success" | "warning" | "default"> = {
  applied: "success",
  partial: "warning",
  "not applied": "default",
};

async function fetchKits(): Promise<KitsState | "forbidden"> {
  const response = await fetch("/api/admin/kits");
  if (response.status === 401 || response.status === 403) return "forbidden";
  if (!response.ok) throw new Error("Kits request failed");
  return (await response.json()) as KitsState;
}

function describeReport(name: string, report: ApplyKitReport): string {
  const parts = [
    `${plural(report.modulesEnabled.length, "module", "modules")} enabled`,
    `${plural(report.collectionsCreated.length, "collection", "collections")} created`,
  ];
  if (report.collectionsSkipped.length) parts.push(`${report.collectionsSkipped.length} already there`);
  if (report.itemsCreated) parts.push(`${plural(report.itemsCreated, "sample item", "sample items")}`);
  return `applied ${name}: ${parts.join(", ")}. recommended skin: ${report.skin}.`;
}

export default function KitsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [state, setState] = useState<KitsState | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<KitId | null>(null);
  const [seedSamples, setSeedSamples] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchKits()
      .then((data) => {
        if (cancelled) return;
        if (data === "forbidden") setForbidden(true);
        else setState(data);
      })
      .catch(() => {
        if (!cancelled) setError("could not load starter kits.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function apply(kit: KitStatus) {
    setApplying(kit.id);
    setError("");
    try {
      const response = await fetch("/api/admin/kits/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kit: kit.id, seedSampleItems: seedSamples[kit.id] ?? true }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "apply failed");
      }
      const report = (await response.json()) as ApplyKitReport;
      addToast(describeReport(kit.name, report), "success");
      const data = await fetchKits();
      if (data !== "forbidden") setState(data);
      // The sidebar and palette are composed on the server per request.
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error && cause.message ? cause.message : "could not apply the kit.";
      setError(`could not apply ${kit.name}: ${message}`);
      addToast(`could not apply ${kit.name}`, "error");
    } finally {
      setApplying(null);
    }
  }

  const header = (
    <PageHeader
      title="starter kits"
      description="a kit is a preset of enabled modules plus seeded collections. applying one sets the modules override and creates any of its collections that do not exist yet; nothing already there is touched."
    />
  );

  if (loading) {
    return (
      <Page width="wide" trail={TRAIL}>
        {header}
        <LoadingState />
      </Page>
    );
  }

  if (forbidden || !state) {
    return (
      <Page width="wide" trail={TRAIL}>
        {header}
        {error && <Notice className="mb-4 border-danger-border bg-danger-soft text-danger">{error}</Notice>}
        {forbidden && (
          <EmptyState
            title="admin access required"
            description="log in as an administrator to continue."
            actions={<LinkButton href="/login" variant="primary">log in</LinkButton>}
          />
        )}
      </Page>
    );
  }

  return (
    <Page width="wide" trail={TRAIL}>
      {header}

      {error && <Notice className="mb-4 border-danger-border bg-danger-soft text-danger">{error}</Notice>}

      <Section title="kits">
        <DataTable>
          <thead>
            <tr>
              <th>kit</th>
              <th>description</th>
              <th>modules</th>
              <th>collections</th>
              <th>status</th>
              <th>apply</th>
            </tr>
          </thead>
          <tbody>
            {state.kits.map((kit) => {
              const busy = applying !== null;
              const withSamples = seedSamples[kit.id] ?? true;
              const hasSamples = kit.collections.some((collection) => collection.sampleItems > 0);
              return (
                <tr key={kit.id}>
                  <td className="font-medium text-heading">
                    {kit.name}
                    <div className="text-[11px] font-normal text-muted">skin: {kit.skin}</div>
                  </td>
                  <td className="text-muted">{kit.description}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {kit.modules.map((id) => (
                        <Chip key={id} tone={kit.modulesEnabled.includes(id) ? "success" : "default"}>
                          {id}
                        </Chip>
                      ))}
                    </div>
                  </td>
                  <td className="text-muted">
                    {kit.collections.length === 0
                      ? "none"
                      : kit.collections.map((collection) => (
                          <div key={collection.slug}>
                            {collection.name}
                            <span className="text-[11px]"> ({collection.exists ? "exists" : "will be created"})</span>
                          </div>
                        ))}
                  </td>
                  <td>
                    <Chip tone={STATUS_TONE[kit.status]}>{kit.status}</Chip>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button disabled={busy} onClick={() => void apply(kit)}>
                        {applying === kit.id ? "applying…" : "apply"}
                      </Button>
                      {hasSamples && (
                        <label className="flex items-center gap-1.5 text-[12px] text-muted">
                          <input
                            type="checkbox"
                            checked={withSamples}
                            disabled={busy}
                            onChange={(event) => setSeedSamples((prev) => ({ ...prev, [kit.id]: event.target.checked }))}
                          />
                          include sample items
                        </label>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </Section>

      <Notice className="mt-3">
        applying a kit stores its module list in the <InlineCode>modules</InlineCode> system setting (see{" "}
        <a href="/admin/modules" className="underline">modules</a>) and creates its collections by slug, so applying twice is safe. a
        kit&apos;s skin is a recommendation: pick it in settings or with <InlineCode>NEXT_PUBLIC_ARKIVEL_SKIN</InlineCode>.
      </Notice>
    </Page>
  );
}

export const dynamic = "force-dynamic";
