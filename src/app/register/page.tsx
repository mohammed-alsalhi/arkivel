"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthFormShell } from "@/components/AuthFormShell";
import Link from "next/link";
import { Field, Input, Page, PageHeader } from "@/components/ui";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/auth/check").then(r => r.json()).then(data => setRegistrationOpen(data.registrationOpen === true)).catch(() => setRegistrationOpen(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Auto-login after registration
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (loginRes.ok) {
          router.push("/");
          router.refresh();
        } else {
          router.push("/login");
        }
      } else {
        setError(data.error || "unable to create the account. check the details and try again.");
      }
    } catch {
      setError("network error. please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (registrationOpen !== true) return <Page><PageHeader title="register" />
    <p>{registrationOpen === null ? "Checking registration…" : "Registration is closed. Contact your administrator for an account."}</p>
    <Link href="/login" className="text-accent underline">log in</Link>
  </Page>;

  return (
    <AuthFormShell
      mode="register"
      onSubmit={handleSubmit}
      error={error}
      loading={loading}
      submitLabel="create account"
      loadingLabel="creating account…"
      alternateText="already have an account?"
      alternateHref="/login"
      alternateLabel="log in"
    >
      <Field htmlFor="register-username" label="username *">
        <Input
          id="register-username"
          type="text"
          autoComplete="username"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_]+"
          placeholder="choose a username"
        />
      </Field>

      <Field htmlFor="register-email" label="email *">
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
        />
      </Field>

      <Field htmlFor="register-password" label="password *">
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={12}
          placeholder="at least 12 characters"
        />
      </Field>

      <Field htmlFor="register-confirm-password" label="confirm password *">
        <Input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={error === "passwords do not match" || undefined}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={12}
          placeholder="re-enter password"
        />
      </Field>
    </AuthFormShell>
  );
}
