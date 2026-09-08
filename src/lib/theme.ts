export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const TRANSITION_CLASS = "theme-transitioning";

/**
 * The theme currently applied to the document. The bootstrap script in
 * layout.tsx sets `data-theme` before first paint, so this reflects reality
 * as soon as the DOM exists.
 */
export function getTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/**
 * Persist and apply a theme. Transitions are suspended for the swap (see
 * misc.css) so every surface snaps at once, then restored on the next frame.
 */
export function setTheme(theme: Theme) {
  const root = document.documentElement;
  localStorage.setItem(STORAGE_KEY, theme);
  root.classList.add(TRANSITION_CLASS);
  root.setAttribute("data-theme", theme);
  void root.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove(TRANSITION_CLASS));
  });
}

/** Flip between light and dark; returns the theme that is now active. */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
