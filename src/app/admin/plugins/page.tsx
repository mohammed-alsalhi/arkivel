"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, LoadingState, Page, PageHeader } from "@/components/ui";

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  compatibility?: {
    arkivel: string;
    pluginApi: string;
  };
  hooks?: string[];
  health?: {
    lastError: string | null;
    lastLoad: string;
    status: "available" | "error";
  };
  permissions?: string[];
  permissionPrompts?: {
    label: string;
    prompt: string;
    risk: "low" | "medium" | "high";
    scope: string;
  }[];
  routes?: string[];
  settings?: string[];
  source?: "registered" | "trusted-local";
  widgets?: string[];
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [loader, setLoader] = useState<{ enabled: boolean; root?: string }>({ enabled: false });
  const [loadErrors, setLoadErrors] = useState<{ id?: string; message: string; path?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/plugins")
      .then((r) => {
        if (r.status === 401) {
          setError("Unauthorized. Please log in as admin.");
          router.push("/admin");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          if (Array.isArray(data)) {
            setPlugins(data);
          } else {
            setPlugins(Array.isArray(data.plugins) ? data.plugins : []);
            setLoader(data.loader ?? { enabled: false });
            setLoadErrors(Array.isArray(data.errors) ? data.errors : []);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load plugins");
        setLoading(false);
      });
  }, [router]);

  async function handleToggle(pluginId: string, enabled: boolean) {
    const res = await fetch("/api/plugins", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pluginId, enabled }),
    });

    if (res.ok) {
      setPlugins((prev) =>
        prev.map((p) => (p.id === pluginId ? { ...p, enabled } : p))
      );
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to update plugin");
    }
  }

  if (loading) {
    return (
      <LoadingState label="Loading plugins..." />
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-wiki-link-broken text-[13px]">
        {error}
      </div>
    );
  }

  return (
    <Page>
      <PageHeader title="Plugins" />

      <div className="wiki-notice mb-4">
        Trusted local plugins are disabled unless{" "}
        <code className="bg-background px-1 py-0.5 text-[12px]">ARKIVEL_ENABLE_TRUSTED_PLUGINS=true</code>{" "}
        and an absolute{" "}
        <code className="bg-background px-1 py-0.5 text-[12px]">ARKIVEL_TRUSTED_PLUGIN_DIR</code>{" "}
        are configured. Arkivel reads manifests and permission metadata here; runtime loading remains guarded.
      </div>

      <div className="border border-border mb-4 p-3 text-[12px]">
        <div className="font-bold text-heading">Trusted local loader</div>
        <div className="text-muted mt-1">
          Status: {loader.enabled ? "Enabled for manifest discovery" : "Disabled"}
          {loader.root ? ` - Directory: ${loader.root}` : ""}
        </div>
        {loadErrors.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-wiki-link-broken">
            {loadErrors.map((item, index) => (
              <li key={`${item.id ?? "plugin"}-${index}`}>
                {item.id ? `${item.id}: ` : ""}{item.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {plugins.length === 0 ? (
        <EmptyState
          title="No valid plugins discovered yet."
          description={
            <>
              Plugins can be registered in{" "}
              <code className="bg-background px-1 py-0.5 text-[12px]">
                src/lib/plugins/registry.ts
              </code>{" "}
              or declared with a trusted local <code className="bg-background px-1 py-0.5 text-[12px]">plugin.json</code>.
            </>
          }
        />
      ) : (
        <div className="space-y-2">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="flex items-center justify-between border border-border p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-heading">
                    {plugin.name}
                  </span>
                  <span className="text-[10px] text-muted border border-border-light px-1.5 py-0.5">
                    v{plugin.version}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 ${
                      plugin.enabled
                        ? "bg-success-soft text-success border border-success-border"
                        : "bg-surface-hover text-muted border border-border-light"
                    }`}
                  >
                    {plugin.enabled ? "Enabled" : "Disabled"}
                  </span>
                  {plugin.health && (
                    <span className="text-[10px] px-1.5 py-0.5 border border-border-light text-muted">
                      Health: {plugin.health.status}
                    </span>
                  )}
                </div>
                {plugin.description && (
                  <p className="text-[12px] text-muted mt-0.5">
                    {plugin.description}
                  </p>
                )}
                <p className="text-[10px] text-muted mt-0.5">
                  ID: {plugin.id} - Source: {plugin.source ?? "registered"}
                </p>
                {plugin.compatibility && (
                  <p className="text-[10px] text-muted mt-0.5">
                    Arkivel {plugin.compatibility.arkivel} - {plugin.compatibility.pluginApi}
                  </p>
                )}
                {plugin.permissions && plugin.permissions.length > 0 && (
                  <p className="text-[10px] text-muted mt-1">
                    Permissions: {plugin.permissions.join(", ")}
                  </p>
                )}
                {plugin.permissionPrompts && plugin.permissionPrompts.length > 0 && (
                  <div className="mt-2 grid gap-1 sm:grid-cols-2">
                    {plugin.permissionPrompts.map((prompt) => (
                      <div key={prompt.scope} className="border border-border-light p-2 text-[10px]">
                        <div className="font-bold text-heading">{prompt.label} ({prompt.risk})</div>
                        <div className="text-muted mt-0.5">{prompt.prompt}</div>
                      </div>
                    ))}
                  </div>
                )}
                {plugin.routes && plugin.routes.length > 0 && (
                  <p className="text-[10px] text-muted mt-0.5">
                    Routes: {plugin.routes.join(", ")}
                  </p>
                )}
                {plugin.widgets && plugin.widgets.length > 0 && (
                  <p className="text-[10px] text-muted mt-0.5">
                    Widgets: {plugin.widgets.join(", ")}
                  </p>
                )}
                {plugin.hooks && plugin.hooks.length > 0 && (
                  <p className="text-[10px] text-muted mt-0.5">
                    Hooks: {plugin.hooks.join(", ")}
                  </p>
                )}
                {plugin.health?.lastError && (
                  <p className="text-[10px] text-wiki-link-broken mt-0.5">
                    Last error: {plugin.health.lastError}
                  </p>
                )}
              </div>

              <Button
                onClick={() => handleToggle(plugin.id, !plugin.enabled)}
                variant={plugin.enabled ? "default" : "primary"}
              >
                {plugin.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
