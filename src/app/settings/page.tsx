"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Button,
  Field,
  Input,
  Page,
  PageHeader,
  SectionPanel,
  Select,
} from "@/components/ui";
import { useToast } from "@/components/Toast";
import { config, type WikiSkin } from "@/lib/config";
import { DEFAULT_PREFERENCES, type UserPreferences } from "@/lib/preferences";
import { SKINS, SKIN_COOKIE, SKIN_LABELS, applySkin } from "@/lib/skin";
import { TRAIL_ROOTS } from "@/lib/trail";

const TRAIL = [TRAIL_ROOTS.settings];
const SETTINGS_DESCRIPTION = "preferences for your account and how the wiki looks.";

type SkinChoice = UserPreferences["skin"];

const SKIN_OPTIONS: { value: SkinChoice; name: string; description: string }[] = [
  {
    value: "",
    name: `site default (${SKIN_LABELS[config.wikiSkin].name})`,
    description: "follow whichever skin this site is configured to use",
  },
  ...SKINS.map((skin: WikiSkin) => ({ value: skin, ...SKIN_LABELS[skin] })),
];

/** Apply a skin choice to the live document; "" clears the cookie and restores the site default. */
function applySkinChoice(skin: SkinChoice) {
  if (skin) {
    applySkin(skin);
    return;
  }
  document.cookie = `${SKIN_COOKIE}=; path=/; max-age=0; samesite=lax`;
  document.documentElement.setAttribute("data-skin", config.wikiSkin);
}

const LOCALES = [
  { value: "en", label: "english" },
  { value: "fr", label: "french" },
  { value: "de", label: "german" },
  { value: "es", label: "spanish" },
  { value: "ar", label: "arabic" },
  { value: "zh", label: "chinese" },
  { value: "ja", label: "japanese" },
  { value: "ko", label: "korean" },
  { value: "pt", label: "portuguese" },
  { value: "ru", label: "russian" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);

  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await fetch("/api/preferences");
        if (res.status === 401) {
          setAuthenticated(false);
          router.push("/admin");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setPrefs(data);
        }
      } catch {
        addToast("failed to load preferences", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchPrefs();
  }, [router, addToast]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        const updated = await res.json();
        setPrefs(updated);
        addToast("settings saved", "success");
      } else {
        const err = await res.json().catch(() => ({ error: "unknown error" }));
        addToast(err.error || "failed to save settings", "error");
      }
    } catch {
      addToast("failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  function selectSkin(skin: SkinChoice) {
    setPrefs((p) => ({ ...p, skin }));
    applySkinChoice(skin);
    // Re-render server chrome (sidebar, viewport color) with the new skin
    router.refresh();
  }

  function handleReset() {
    setPrefs((current) => ({
      ...current,
      skin: DEFAULT_PREFERENCES.skin,
      editorMode: DEFAULT_PREFERENCES.editorMode,
      articlesPerPage: DEFAULT_PREFERENCES.articlesPerPage,
      locale: DEFAULT_PREFERENCES.locale,
    }));
    applySkinChoice(DEFAULT_PREFERENCES.skin);
    router.refresh();
  }

  if (!authenticated) {
    return null;
  }

  if (loading) {
    return (
      <Page trail={TRAIL}>
        <PageHeader title="settings" description={SETTINGS_DESCRIPTION} />
        <div className="space-y-4">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text w-3/4" />
          <div className="skeleton skeleton-text w-1/2" />
          <div className="skeleton skeleton-text w-2/3" />
        </div>
      </Page>
    );
  }

  return (
    <Page trail={TRAIL}>
      <PageHeader title="settings" description={SETTINGS_DESCRIPTION} />

      <div className="max-w-xl space-y-6">
        <SectionPanel title="appearance" bodyClassName="space-y-3">
          <fieldset>
            <legend className="ui-label mb-1.5">skin</legend>
            <div className="space-y-2">
              {SKIN_OPTIONS.map((option) => (
                <label
                  key={option.value || "default"}
                  className="flex items-start gap-2 text-[13px] cursor-pointer"
                >
                  <input
                    type="radio"
                    name="skin"
                    value={option.value}
                    checked={prefs.skin === option.value}
                    onChange={() => selectSkin(option.value)}
                    className="accent-accent mt-0.5"
                  />
                  <span>
                    <span className="block">{option.name}</span>
                    <span className="block text-muted">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </SectionPanel>

        <SectionPanel title="editor" bodyClassName="space-y-3">
          <fieldset>
            <legend className="ui-label mb-1.5">default editor mode</legend>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                <input
                  type="radio"
                  name="editorMode"
                  value="rich"
                  checked={prefs.editorMode === "rich"}
                  onChange={() =>
                    setPrefs((p) => ({ ...p, editorMode: "rich" }))
                  }
                  className="accent-accent"
                />
                rich text
              </label>
              <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                <input
                  type="radio"
                  name="editorMode"
                  value="markdown"
                  checked={prefs.editorMode === "markdown"}
                  onChange={() =>
                    setPrefs((p) => ({ ...p, editorMode: "markdown" }))
                  }
                  className="accent-accent"
                />
                markdown
              </label>
            </div>
          </fieldset>
        </SectionPanel>

        <SectionPanel title="display" bodyClassName="space-y-3">
          <Field htmlFor="articlesPerPage" label="articles per page">
            <Input
              id="articlesPerPage"
              type="number"
              min={5}
              max={100}
              step={5}
              value={prefs.articlesPerPage}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  articlesPerPage: Math.max(
                    5,
                    Math.min(100, parseInt(e.target.value) || 20)
                  ),
                }))
              }
              className="w-20"
            />
          </Field>
        </SectionPanel>

        <SectionPanel title="locale">
          <Field htmlFor="locale" label="language">
            <Select
              id="locale"
              value={prefs.locale}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, locale: e.target.value }))
              }
              className="w-48"
            >
              {LOCALES.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </Select>
          </Field>
        </SectionPanel>

        <SectionPanel title="sessions" bodyClassName="text-[13px]">
          <p className="text-muted mb-2">
            review devices signed in to your account and revoke old sessions.
          </p>
          <Link href="/settings/sessions" className="text-accent hover:underline text-[13px]">
            manage sessions →
          </Link>
        </SectionPanel>

        <SectionPanel title="api tokens" bodyClassName="text-[13px]">
          <p className="text-muted mb-2">
            personal access tokens let scripts and other apps use the api as you.
          </p>
          <Link href="/settings/tokens" className="text-accent hover:underline text-[13px]">
            manage api tokens →
          </Link>
        </SectionPanel>

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="primary"
            className="disabled:opacity-50"
          >
            {saving ? "saving…" : "save settings"}
          </Button>
          <Button onClick={handleReset} type="button">
            reset to defaults
          </Button>
        </div>
      </div>
    </Page>
  );
}
