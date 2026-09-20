"use client";

import { FormEvent, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { Button, CodeBlock, EmptyState, Field, Input, LoadingState, Page, PageHeader, Select } from "@/components/ui";
import type { ApiTokenSummary } from "@/lib/api-tokens";
import { TRAIL_ROOTS } from "@/lib/trail";

const TRAIL = [TRAIL_ROOTS.settings, { label: "api tokens" }];
const EXPIRIES: { value: string; label: string }[] = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "one year" },
  { value: "never", label: "never" },
];

function when(value: string | null, fallback: string) {
  return value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : fallback;
}

export default function TokensPage() {
  const { addToast } = useToast();
  const [tokens, setTokens] = useState<ApiTokenSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("90");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ token: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tokens")
      .then(async (response) => (response.ok ? setTokens(await response.json()) : null))
      .finally(() => setLoading(false));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, expiresInDays: expiry === "never" ? null : Number(expiry) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "unable to create the token. try again.");
      const { token, ...summary } = payload as ApiTokenSummary & { token: string };
      setTokens((current) => [summary, ...current]);
      setFresh({ token, name: summary.name });
      setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "unable to create the token. try again.");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(token: ApiTokenSummary) {
    if (!confirm(`revoke "${token.name}"? anything using it stops working immediately.`)) return;
    setRevoking(token.id);
    const response = await fetch(`/api/tokens/${token.id}`, { method: "DELETE" });
    if (response.ok || response.status === 404) {
      setTokens((current) => current.filter((entry) => entry.id !== token.id));
      addToast(`revoked ${token.name}`, "success");
    } else {
      addToast("unable to revoke that token. try again.", "error");
    }
    setRevoking(null);
  }

  async function copy() {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.token);
      addToast("token copied", "success");
    } catch {
      addToast("select the token and copy it by hand.", "warning");
    }
  }

  return (
    <Page trail={TRAIL} width="narrow">
      <PageHeader
        title="api tokens"
        description="personal access tokens let scripts and other apps use the api as you, with your role. send one as an authorization: bearer header."
      />

      <form onSubmit={create} className="space-y-3 max-w-sm">
        <Field htmlFor="token-name" label="name" hint="what will use it, so you know which one to revoke later.">
          <Input id="token-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} placeholder="homelab dashboard" />
        </Field>
        <Field htmlFor="token-expiry" label="expires">
          <Select id="token-expiry" value={expiry} onChange={(event) => setExpiry(event.target.value)}>
            {EXPIRIES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </Field>
        {error && <p className="ui-field-error" role="alert">{error}</p>}
        <Button type="submit" variant="primary" disabled={creating}>{creating ? "creating…" : "create token"}</Button>
      </form>

      {fresh && (
        <section className="wiki-notice space-y-2" aria-live="polite">
          <p className="font-semibold">copy your new token for {fresh.name} now. it is shown once.</p>
          <CodeBlock><code>{fresh.token}</code></CodeBlock>
          <div className="flex gap-2">
            <Button onClick={copy}>copy token</Button>
            <Button onClick={() => setFresh(null)}>done</Button>
          </div>
          <p className="ui-muted">example: <code className="ui-inline-code">curl -H &quot;Authorization: Bearer {fresh.token.slice(0, 12)}…&quot; {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/articles</code></p>
        </section>
      )}

      {loading ? (
        <LoadingState />
      ) : tokens.length === 0 ? (
        <EmptyState title="no tokens yet" description="create one above to use the api from a script or another app." />
      ) : (
        <ul className="wiki-compact-list" aria-label="your api tokens">
          {tokens.map((token) => (
            <li key={token.id} className="wiki-compact-list-item flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="wiki-compact-list-title">{token.name}</div>
                <div className="text-[12px] text-muted">
                  <code className="ui-inline-code">{token.prefix}…</code> · created {when(token.createdAt, "")} · last used {when(token.lastUsedAt, "never")} · expires {when(token.expiresAt, "never")}
                </div>
              </div>
              <Button variant="danger" onClick={() => revoke(token)} disabled={revoking === token.id}>
                {revoking === token.id ? "revoking…" : "revoke"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
