"use client";

import type { ReactNode } from "react";

type PreferenceToggleProps = {
  active: boolean;
  onToggle: () => void;
  /** Tooltip when the preference is currently on. */
  titleOn: string;
  /** Tooltip when the preference is currently off. */
  titleOff: string;
  /** Extra classes appended to the base `ui-button`. */
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
};

/**
 * Shared button shell for the reading-preference toggles. Pair with
 * usePersistedToggle from src/lib/usePersistedToggle.ts for state.
 */
export default function PreferenceToggle({
  active,
  onToggle,
  titleOn,
  titleOff,
  className,
  "aria-label": ariaLabel,
  children,
}: PreferenceToggleProps) {
  return (
    <button
      onClick={onToggle}
      title={active ? titleOn : titleOff}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={className ? `ui-button ${className}` : "ui-button"}
    >
      {children}
    </button>
  );
}
