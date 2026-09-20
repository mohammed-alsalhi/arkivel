import Link from "next/link";
import type { FormEventHandler, ReactNode } from "react";
import { Button, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS, type TrailItem } from "@/lib/trail";

type AuthMode = "login" | "register";

const AUTH_PAGES: Record<AuthMode, { title: string; trail: TrailItem[] }> = {
  login: { title: "log in", trail: [TRAIL_ROOTS.account, { label: "log in" }] },
  register: { title: "register", trail: [TRAIL_ROOTS.account, { label: "register" }] },
};

type AuthFormShellProps = {
  mode: AuthMode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  error: string;
  loading: boolean;
  submitLabel: string;
  loadingLabel: string;
  alternateText: string;
  alternateHref?: string;
  afterForm?: ReactNode;
  alternateLabel: string;
};

export function AuthFormShell({
  mode,
  onSubmit,
  children,
  error,
  loading,
  submitLabel,
  loadingLabel,
  alternateText,
  alternateHref,
  alternateLabel,
  afterForm,
}: AuthFormShellProps) {
  const { title, trail } = AUTH_PAGES[mode];
  return (
    <Page trail={trail}>
      <PageHeader title={title} />
      <div className="max-w-sm">
        <form onSubmit={onSubmit} className="space-y-3">
          {children}

          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="disabled:opacity-50"
          >
            {loading ? loadingLabel : submitLabel}
          </Button>
        </form>

        {afterForm}
        {alternateHref && <p className="text-[12px] text-muted mt-4">
          {alternateText}{" "}
          <Link href={alternateHref} className="text-accent underline">
            {alternateLabel}
          </Link>
        </p>}
      </div>
    </Page>
  );
}
