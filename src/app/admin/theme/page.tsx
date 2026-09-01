"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { Button, EmptyState, Page, PageHeader } from "@/components/ui";

interface ThemeVariables {
  "--color-accent": string;
  "--color-background": string;
  "--color-surface": string;
  "--color-foreground": string;
  "--color-muted": string;
  "--color-border": string;
}

interface ThemeConfig {
  id: string;
  name: string;
  variables: ThemeVariables;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_VARIABLES: ThemeVariables = {
  "--color-accent": "#3b82f6",
  "--color-background": "#ffffff",
  "--color-surface": "#f8f9fa",
  "--color-foreground": "#1a1a1a",
  "--color-muted": "#6b7280",
  "--color-border": "#e5e7eb",
};

const CSS_VAR_LABELS: Record<keyof ThemeVariables, string> = {
  "--color-accent": "Accent",
  "--color-background": "Background",
  "--color-surface": "Surface",
  "--color-foreground": "Foreground",
  "--color-muted": "Muted",
  "--color-border": "Border",
};

export default function ThemeBuilderPage() {
  const { addToast } = useToast();
  const [variables, setVariables] = useState<ThemeVariables>(DEFAULT_VARIABLES);
  const [themeName, setThemeName] = useState("My Theme");
  const [savedThemes, setSavedThemes] = useState<ThemeConfig[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchThemes = useCallback(async () => {
    try {
      const res = await fetch("/api/themes");
      if (res.ok) {
        const data = await res.json();
        setSavedThemes(data);
      }
    } catch {
      // Non-fatal; themes list may be empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  function updateVariable(key: keyof ThemeVariables, value: string) {
    setVariables((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!themeName.trim()) {
      addToast("Theme name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: themeName, variables }),
      });
      if (res.ok) {
        addToast("Theme saved successfully", "success");
        await fetchThemes();
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        addToast(err.error || "Failed to save theme", "error");
      }
    } catch {
      addToast("Failed to save theme", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleLoadTheme(themeId: string) {
    if (!themeId) return;
    const theme = savedThemes.find((t) => t.id === themeId);
    if (!theme) return;
    setVariables(theme.variables as ThemeVariables);
    setThemeName(theme.name);
    setSelectedThemeId(themeId);
    addToast(`Loaded theme: ${theme.name}`, "success");
  }

  function handleExport() {
    const data = JSON.stringify({ name: themeName, variables }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${themeName.replace(/\s+/g, "-").toLowerCase()}.theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.variables && typeof parsed.variables === "object") {
          setVariables({ ...DEFAULT_VARIABLES, ...parsed.variables });
          if (parsed.name) setThemeName(parsed.name);
          addToast("Theme imported successfully", "success");
        } else {
          addToast("Invalid theme file format", "error");
        }
      } catch {
        addToast("Failed to parse theme file", "error");
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = "";
  }

  function handleReset() {
    setVariables(DEFAULT_VARIABLES);
    setThemeName("My Theme");
    setSelectedThemeId("");
    addToast("Theme reset to defaults", "success");
  }

  // Build preview style object from current variables
  const previewStyle = Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [k, v])
  ) as React.CSSProperties;

  return (
    <Page>
      <PageHeader title="Theme Builder" />

      <div className="flex gap-6 flex-wrap">
        {/* ── Controls panel ── */}
        <div className="flex-shrink-0 w-80 space-y-4">
          {/* Theme name */}
          <section className="border border-border bg-surface">
            <div className="bg-infobox-header px-4 py-2 text-[13px] font-bold text-foreground border-b border-border">
              Theme name
            </div>
            <div className="px-4 py-3">
              <input
                type="text"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="My Theme"
                className="w-full px-2 py-1 pointer-coarse:py-2 text-[13px] border border-border bg-background text-foreground"
              />
            </div>
          </section>

          {/* Color pickers */}
          <section className="border border-border bg-surface">
            <div className="bg-infobox-header px-4 py-2 text-[13px] font-bold text-foreground border-b border-border">
              Colors
            </div>
            <div className="px-4 py-3 space-y-3">
              {(Object.keys(DEFAULT_VARIABLES) as (keyof ThemeVariables)[]).map(
                (cssVar) => (
                  <div key={cssVar} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={variables[cssVar]}
                      onChange={(e) => updateVariable(cssVar, e.target.value)}
                      className="w-8 h-8 pointer-coarse:w-10 pointer-coarse:h-10 border border-border cursor-pointer rounded-sm"
                      title={CSS_VAR_LABELS[cssVar]}
                    />
                    <div className="flex-1">
                      <div className="text-[12px] font-medium text-heading">
                        {CSS_VAR_LABELS[cssVar]}
                      </div>
                      <input
                        type="text"
                        value={variables[cssVar]}
                        onChange={(e) => updateVariable(cssVar, e.target.value)}
                        placeholder="#000000"
                        className="w-full px-2 py-0.5 pointer-coarse:py-2 text-[11px] border border-border bg-background text-foreground font-mono"
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          {/* Load saved theme */}
          <section className="border border-border bg-surface">
            <div className="bg-infobox-header px-4 py-2 text-[13px] font-bold text-foreground border-b border-border">
              Load saved theme
            </div>
            <div className="px-4 py-3">
              {loading ? (
                <div className="skeleton skeleton-text w-full" />
              ) : savedThemes.length === 0 ? (
                <EmptyState title="No saved themes yet." />
              ) : (
                <select
                  value={selectedThemeId}
                  onChange={(e) => handleLoadTheme(e.target.value)}
                  className="w-full px-2 py-1 pointer-coarse:py-2 text-[13px] border border-border bg-background text-foreground"
                >
                  <option value="">Select a theme…</option>
                  {savedThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="primary"
              className="w-full"
            >
              {saving ? "Saving…" : "Save theme"}
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleExport} className="flex-1">
                Export JSON
              </Button>
              <Button onClick={handleImportClick} className="flex-1">
                Import JSON
              </Button>
            </div>
            <Button onClick={handleReset} className="w-full">
              Reset to defaults
            </Button>
          </div>

          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        {/* ── Live preview panel ── */}
        <div className="flex-1 min-w-0">
          <div
            className="border border-border p-6 space-y-6"
            style={{
              ...previewStyle,
              backgroundColor: variables["--color-background"],
              color: variables["--color-foreground"],
            }}
          >
            <h2
              className="text-lg font-semibold pb-2 border-b"
              style={{ borderColor: variables["--color-border"] }}
            >
              Live Preview
            </h2>

            {/* Sample article card */}
            <div
              className="border rounded p-4 space-y-2"
              style={{
                borderColor: variables["--color-border"],
                backgroundColor: variables["--color-surface"],
              }}
            >
              <div
                className="text-base font-semibold"
                style={{ color: variables["--color-foreground"] }}
              >
                Sample Article Card
              </div>
              <p
                className="text-[13px]"
                style={{ color: variables["--color-muted"] }}
              >
                This is a preview of how article cards will look with your
                chosen theme colors. The excerpt text uses the muted color.
              </p>
              <a
                className="text-[13px] underline"
                style={{ color: variables["--color-accent"] }}
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                Read more
              </a>
            </div>

            {/* Button variants */}
            <div className="space-y-2">
              <div
                className="text-[12px] uppercaser font-semibold"
                style={{ color: variables["--color-muted"] }}
              >
                Buttons
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-4 py-1.5 text-[13px] rounded font-medium"
                  style={{
                    backgroundColor: variables["--color-accent"],
                    color: "var(--color-accent-foreground)",
                  }}
                >
                  Primary
                </button>
                <button
                  className="px-4 py-1.5 text-[13px] rounded border font-medium"
                  style={{
                    borderColor: variables["--color-border"],
                    backgroundColor: variables["--color-surface"],
                    color: variables["--color-foreground"],
                  }}
                >
                  Secondary
                </button>
                <button
                  className="px-4 py-1.5 text-[13px] rounded font-medium"
                  style={{
                    backgroundColor: "transparent",
                    color: variables["--color-accent"],
                  }}
                >
                  Ghost
                </button>
              </div>
            </div>

            {/* Badge */}
            <div className="space-y-2">
              <div
                className="text-[12px] uppercaser font-semibold"
                style={{ color: variables["--color-muted"] }}
              >
                Badges
              </div>
              <div className="flex gap-2 flex-wrap">
                <span
                  className="px-2 py-0.5 text-[11px] rounded-full font-medium"
                  style={{
                    backgroundColor: variables["--color-accent"] + "22",
                    color: variables["--color-accent"],
                  }}
                >
                  Published
                </span>
                <span
                  className="px-2 py-0.5 text-[11px] rounded-full font-medium"
                  style={{
                    backgroundColor: variables["--color-muted"] + "22",
                    color: variables["--color-muted"],
                  }}
                >
                  Draft
                </span>
                <span
                  className="px-2 py-0.5 text-[11px] rounded-full font-medium"
                  style={{
                    backgroundColor: variables["--color-surface"],
                    color: variables["--color-foreground"],
                    border: `1px solid ${variables["--color-border"]}`,
                  }}
                >
                  Category
                </span>
              </div>
            </div>

            {/* Form input */}
            <div className="space-y-2">
              <div
                className="text-[12px] uppercaser font-semibold"
                style={{ color: variables["--color-muted"] }}
              >
                Form Input
              </div>
              <div className="space-y-1.5">
                <label
                  className="block text-[13px] font-medium"
                  style={{ color: variables["--color-foreground"] }}
                >
                  Search articles
                </label>
                <input
                  type="text"
                  placeholder="Type to search…"
                  readOnly
                  className="w-full max-w-xs px-3 py-1.5 text-[13px] border rounded"
                  style={{
                    borderColor: variables["--color-border"],
                    backgroundColor: variables["--color-background"],
                    color: variables["--color-foreground"],
                  }}
                />
              </div>
            </div>

            {/* Color swatches */}
            <div className="space-y-2">
              <div
                className="text-[12px] uppercaser font-semibold"
                style={{ color: variables["--color-muted"] }}
              >
                Color Palette
              </div>
              <div className="flex gap-2 flex-wrap">
                {(
                  Object.entries(variables) as [keyof ThemeVariables, string][]
                ).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div
                      className="w-10 h-10 rounded border"
                      style={{
                        backgroundColor: value,
                        borderColor: variables["--color-border"],
                      }}
                      title={`${CSS_VAR_LABELS[key]}: ${value}`}
                    />
                    <div
                      className="text-[10px] mt-0.5"
                      style={{ color: variables["--color-muted"] }}
                    >
                      {CSS_VAR_LABELS[key]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
