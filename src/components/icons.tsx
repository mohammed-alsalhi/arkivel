import type { IconName } from "@/modules/types";

/** The shared inline icon set for navigation rows; `IconName` keys index it. */

const navIconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SearchIcon() {
  return (
    <svg {...navIconProps}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

export function InboxIcon() {
  return (
    <svg {...navIconProps}>
      <path d="M4 5h16v14H4z" />
      <path d="M4 14h5l1.5 2.5h3L15 14h5" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...navIconProps}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function PagesIcon() {
  return (
    <svg {...navIconProps}>
      <path d="M8 3h7l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M15 3v4h4" />
      <path d="M4 7v13a1 1 0 0 0 1 1h10" />
    </svg>
  );
}

export function TagIcon() {
  return (
    <svg {...navIconProps}>
      <path d="M3 12V4h8l9 9-8 8-9-9z" />
      <circle cx="7.5" cy="8.5" r="1.25" />
    </svg>
  );
}

export function GraphIcon() {
  return (
    <svg {...navIconProps}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="8" r="2.5" />
      <circle cx="10" cy="18" r="2.5" />
      <path d="M8.2 7.2 15.6 8.1M7.2 8.3l1.9 7.3M12.3 16.8l4.4-6.6" />
    </svg>
  );
}

export function FolderIcon() {
  return (
    <svg {...navIconProps}>
      <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg {...navIconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg {...navIconProps}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="10" y1="10" x2="10" y2="20" />
    </svg>
  );
}

export const NAV_ICONS: Record<IconName, () => React.JSX.Element> = {
  table: TableIcon,
  search: SearchIcon,
  inbox: InboxIcon,
  plus: PlusIcon,
  pages: PagesIcon,
  tag: TagIcon,
  graph: GraphIcon,
  folder: FolderIcon,
  gear: GearIcon,
};

/** Renders the icon registered under `name`. */
export function NavIcon({ name }: { name: IconName }) {
  const Icon = NAV_ICONS[name];
  return <Icon />;
}
