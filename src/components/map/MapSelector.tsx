"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

type MapConfig = {
  id: string;
  mapId: string;
  name: string;
  description: string | null;
};

export default function MapSelector({ maps }: { maps: MapConfig[] }) {
  const pathname = usePathname();

  if (maps.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 border-b border-border bg-surface px-2 py-1">
      <span className="text-[11px] text-muted mr-1">Maps:</span>
      {maps.map((map) => {
        const href = `/map/${map.mapId}`;
        const isActive = pathname === href;
        return (
          <Link
            key={map.mapId}
            href={href}
            className={clsx(
              "px-2 py-0.5 text-[12px] border transition-colors",
              isActive
                ? "bg-accent text-accent-foreground border-accent"
                : "border-border bg-surface-hover text-foreground hover:bg-surface"
            )}
          >
            {map.name}
          </Link>
        );
      })}
    </div>
  );
}
