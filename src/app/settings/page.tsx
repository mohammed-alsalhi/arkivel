"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Button,
  Page,
  PageHeader,
  SectionPanel,
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
    setPrefs({ ...DEFAULT_PREFERENCES });
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
            <div className="skin-options">
              {SKIN_OPTIONS.map((option) => (
                <label
                  key={option.value || "default"}
                  className="skin-option text-[13px]"
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
                    <span className="skin-preview" data-preview={option.value || config.wikiSkin} aria-hidden="true"><i /><span>Field notes<br />A place for ideas.</span></span>
                    <span className="block">{option.name}</span>
                    <span className="block text-muted">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
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
