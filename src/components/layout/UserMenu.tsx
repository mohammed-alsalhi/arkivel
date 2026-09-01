"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useOutsideClick } from "@/lib/useOutsideClick";

type User = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
} | null;

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}


export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((data) => {
        setIsAdmin(!!data.admin);
        setUser(data.user ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [pathname]);

  // Close on outside click
  useOutsideClick(ref, () => setOpen(false), open);

  async function handleLogout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    setUser(null);
    setIsAdmin(false);
  }

  const initials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="User menu"
        aria-expanded={open}
        className={clsx("ui-icon-button", open && "bg-surface-hover text-foreground")}
      >
        {loaded && initials ? (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-heading text-surface text-[9px] font-bold leading-none">
            {initials}
          </span>
        ) : (
          <UserIcon />
        )}
      </button>

      {open && (
        <div className="ui-dropdown w-44 py-1">
          {user ? (
            <>
              {/* Logged-in user info */}
              <div className="px-3 py-2 border-b border-border">
                <div className="text-[12px] font-bold text-heading truncate">
                  {user.displayName || user.username}
                </div>
                <div className="text-[11px] text-muted truncate">@{user.username}</div>
                {user.role !== "viewer" && (
                  <div className="text-[10px] text-muted capitalize mt-0.5">{user.role}</div>
                )}
              </div>

              <MenuItem href="/dashboard" onClick={() => setOpen(false)}>
                My dashboard
              </MenuItem>
              <MenuItem href="/settings" onClick={() => setOpen(false)}>
                Settings
              </MenuItem>

              {isAdmin && (
                <>
                  <div className="border-t border-border my-1" />
                  <MenuItem href="/admin" onClick={() => setOpen(false)}>
                    Admin panel
                  </MenuItem>
                </>
              )}

              <div className="border-t border-border my-1" />
              <button
                onClick={handleLogout}
                className="ui-dropdown-item text-wiki-link"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <MenuItem href="/login" onClick={() => setOpen(false)}>
                Log in
              </MenuItem>
              <MenuItem href="/register" onClick={() => setOpen(false)}>
                Sign up
              </MenuItem>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="ui-dropdown-item text-wiki-link"
    >
      {children}
    </Link>
  );
}
