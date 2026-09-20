"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthFormShell } from "@/components/AuthFormShell";
import { signIn } from "next-auth/react";
import { Field, Input, Button } from "@/components/ui";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/auth/check").then(r => r.json()).then(data => {
      setRegistrationOpen(data.registrationOpen === true);
      setProviders(data.providers || []);
      if (new URLSearchParams(window.location.search).has("error")) {
        setError("Unable to sign in with that provider. Use your existing login or contact your administrator.");
      }
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "check your username and password.");
      }
    } catch {
      setError("network error. please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell
      mode="login"
      onSubmit={handleSubmit}
      error={error}
      loading={loading}
      submitLabel="log in"
      loadingLabel="logging in…"
      alternateText="don't have an account?"
      alternateHref={registrationOpen ? "/register" : undefined}
      afterForm={<div className="mt-4 space-y-2">
        {providers.map(provider => <Button key={provider} type="button" onClick={() => signIn(provider, { callbackUrl: "/" })}>
          continue with {provider === "github" ? "GitHub" : "Google"}
        </Button>)}
        {!registrationOpen && <p className="text-[12px] text-muted">New accounts are managed by your administrator.</p>}
      </div>}
      alternateLabel="register"
    >
      <Field htmlFor="login-username" label="username">
        <Input
          id="login-username"
          type="text"
          autoComplete="username"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="username"
        />
      </Field>

      <Field htmlFor="login-password" label="password">
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="password"
        />
      </Field>
    </AuthFormShell>
  );
}
