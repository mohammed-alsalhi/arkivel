"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { WikiSkin } from "@/lib/config";
import { currentSkin } from "@/lib/skin";

const SkinContext = createContext<WikiSkin>("folio");

/** Provides the skin the server resolved for this request; the client keeps
 *  following `<html data-skin>` so live skin switches re-render without a reload. */
export function SkinProvider({ children, skin }: { children: ReactNode; skin: WikiSkin }) {
  return <SkinContext.Provider value={skin}>{children}</SkinContext.Provider>;
}

function subscribe(onChange: () => void) {
  if (typeof MutationObserver === "undefined") return () => undefined;
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-skin"] });
  return () => observer.disconnect();
}

/** The active skin: the live `data-skin` attribute on the client, the server-resolved value during SSR. */
export function useSkin(): WikiSkin {
  const initial = useContext(SkinContext);
  const getServerSnapshot = useCallback(() => initial, [initial]);
  return useSyncExternalStore(subscribe, currentSkin, getServerSnapshot);
}
