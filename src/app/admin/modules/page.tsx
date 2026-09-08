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
  ToggleSwitch,
} from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";
import type { ModuleId } from "@/modules/types";

const TRAIL = [TRAIL_ROOTS.admin, { label: "modules" }];

type ModuleRow = {
  id: ModuleId;
  name: string;
  description: string;
  routes: string[];
  defaultEnabled: boolean;
};

type ModulesState = {
  env: string | null;
  envDefault: ModuleId[];
  override: ModuleId[] | null;
  enabled: ModuleId[];
  modules: ModuleRow[];
};

export default function ModulesPage() {
  const router = useRouter();
  const [state, setState] = useState<ModulesState | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/modules")
      .then(async (response) => {
        if (response.status === 403) {
          if (!cancelled) setForbidden(true);
          return;
        }
        if (!response.ok) throw new Error("Modules request failed");
        const data = (await response.json()) as ModulesState;
        if (!cancelled) setState(data);
      })
      .catch(() => {
        if (!cancelled) setError("could not load modules.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function apply(request: () => Promise<Response>) {
    setSaving(true);
    setError("");
    try {
      const response = await request();
      if (!response.ok) throw new Error("Modules update failed");
      setState((await response.json()) as ModulesState);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // The sidebar and palette are composed on the server per request.
      router.refresh();
    } catch {
      setError("could not update modules.");
    } finally {
      setSaving(false);
    }
  }

  function toggle(id: ModuleId) {
    if (!state) return;
    const enabled = state.enabled.includes(id)
      ? state.enabled.filter((moduleId) => moduleId !== id)
      : [...state.enabled, id];
    void apply(() =>
      fetch("/api/admin/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      }),
    );
  }

  function reset() {
    void apply(() => fetch("/api/admin/modules", { method: "DELETE" }));
  }

  const header = (
    <PageHeader
      title="modules"
      description="choose which optional features this deployment serves. a disabled module's pages and api routes answer 404."
      actions={
        <Button onClick={reset} disabled={saving || !state?.override}>
          reset to environment default
        </Button>
      }
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

      <div className="mb-4 flex flex-wrap items-center gap-3 text-[13px]">
        <span className="text-muted">
          environment default:{" "}
          {state.env ? (
            <InlineCode>ARKIVEL_MODULES={state.env}</InlineCode>
          ) : (
            <>
              <InlineCode>ARKIVEL_MODULES</InlineCode> unset — {state.envDefault.join(", ")}
            </>
          )}
        </span>
        {state.override ? <Chip tone="warning">override active</Chip> : <Chip>environment default</Chip>}
        {saved && <span className="text-[11px] text-muted">saved</span>}
      </div>

      <Section title="modules">
        <DataTable>
          <thead>
            <tr>
              <th>module</th>
              <th>description</th>
              <th>routes</th>
              <th>enabled</th>
            </tr>
          </thead>
          <tbody>
            {state.modules.map((module) => {
              const enabled = state.enabled.includes(module.id);
              return (
                <tr key={module.id}>
                  <td className="font-medium text-heading">{module.name}</td>
                  <td className="text-muted">{module.description}</td>
                  <td className="text-muted">{module.routes.join(", ")}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <ToggleSwitch
                        aria-label={`toggle ${module.name} module`}
                        checked={enabled}
                        disabled={saving}
                        onClick={() => toggle(module.id)}
                      />
                      <span className="text-[12px] text-muted">
                        {enabled ? "on" : "off"}
                        {state.envDefault.includes(module.id) !== enabled && " (overridden)"}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </Section>

      <Notice className="mt-3">
        the environment default comes from <InlineCode>ARKIVEL_MODULES</InlineCode> (a comma list; unset
        enables every module&apos;s default). switching a module here stores an override in the{" "}
        <InlineCode>modules</InlineCode> system setting until it is reset.
      </Notice>
    </Page>
  );
}

export const dynamic = "force-dynamic";
