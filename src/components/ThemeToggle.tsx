"use client";

import { useState, useEffect } from "react";
import { IconButton } from "@/components/ui";
import { getTheme, toggleTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // The bootstrap script in layout.tsx already applied the persisted theme
    // before first paint; just read it back so the toggle reflects reality.
    setDark(getTheme() === "dark");
    setMounted(true);

    // Other controls (the command palette) can flip the theme too; keep the
    // icon honest by watching the attribute instead of owning the state.
    const observer = new MutationObserver(() => setDark(getTheme() === "dark"));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  function toggle() {
    setDark(toggleTheme() === "dark");
  }

  if (!mounted) {
    // Render a placeholder with same dimensions to prevent layout shift
    return <span className="inline-block w-7 h-7" />;
  }

  return (
    <IconButton
      onClick={toggle}
      label="toggle theme"
      title={dark ? "switch to light mode" : "switch to dark mode"}
      aria-pressed={dark}
    >
      {dark ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </IconButton>
  );
}
