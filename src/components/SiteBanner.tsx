import type { ReactNode } from "react";
import clsx from "clsx";

type SiteBannerTone = "warning" | "info";

const toneClasses: Record<SiteBannerTone, string> = {
  warning: "bg-warning-soft border-warning-border text-warning",
  info: "bg-info-soft border-info-border text-info",
};

type SiteBannerProps = {
  children: ReactNode;
  icon?: ReactNode;
  tone?: SiteBannerTone;
};

export default function SiteBanner({ children, icon, tone = "info" }: SiteBannerProps) {
  return (
    <div
      role="status"
      className={clsx(
        "wiki-site-banner flex items-center justify-center gap-2 border-b px-4 py-2 text-center text-[12px]",
        toneClasses[tone],
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

export function MaintenanceBanner() {
  return (
    <SiteBanner
      tone="warning"
      icon={
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      }
    >
      <strong>maintenance mode is active.</strong> the wiki is undergoing maintenance — some features may be temporarily unavailable.
    </SiteBanner>
  );
}

export function ReadOnlyBanner() {
  return (
    <SiteBanner
      tone="info"
      icon={
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      }
    >
      <strong>read-only mode is active.</strong> page editing is temporarily disabled for non-admin users.
    </SiteBanner>
  );
}
