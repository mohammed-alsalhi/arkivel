"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pathTitle(pathname: string): string {
  if (pathname === "/") return "Main Page";

  const parts = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });

  const last = parts.at(-1) ?? "Page";
  return titleCase(last.replace(/[-_]+/g, " "));
}

function cleanPageTitle(value: string, appName: string): string {
  const title = value.trim().replace(/\s+/g, " ");
  if (!title) return pathTitle(window.location.pathname);
  if (title === appName) return "Main Page";

  const brandPrefix = `${appName} `;
  return title.startsWith(brandPrefix) ? title.slice(brandPrefix.length).trim() : title;
}

export default function DocumentTitle({ appName }: { appName: string }) {
  const pathname = usePathname();

  useEffect(() => {
    function updateTitle() {
      const heading = document.querySelector<HTMLElement>("#main-content h1");
      const pageName = cleanPageTitle(heading?.innerText ?? pathTitle(pathname), appName);
      document.title = `${appName} - ${pageName}`;
    }

    updateTitle();

    const main = document.getElementById("main-content");
    if (!main) return undefined;

    const observer = new MutationObserver(updateTitle);
    observer.observe(main, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [appName, pathname]);

  return null;
}
