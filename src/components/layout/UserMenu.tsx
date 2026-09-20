"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dropdown, DropdownItem, DropdownLink, IconButton } from "@/components/ui";

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
  const [registrationOpen, setRegistrationOpen] = useState(false);
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
        setRegistrationOpen(data.registrationOpen === true);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [pathname]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        // IconButton does not forward refs; the trigger is the wrapper's direct button child.
        ref.current?.querySelector<HTMLButtonElement>(":scope > button")?.focus();
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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
      <IconButton
        label="user menu"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {loaded && initials ? (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-heading text-surface text-[9px] font-bold leading-none">
            {initials}
          </span>
        ) : (
          <UserIcon />
        )}
      </IconButton>

      {open && (
        <Dropdown className="w-44 py-1">
          {user ? (
            <>
              {/* Logged-in user info */}
              <div className="px-3 py-2 border-b border-border">
                <div className="text-[12px] font-bold text-heading truncate" title={user.displayName || user.username}>
                  {user.displayName || user.username}
                </div>
                <div className="text-[11px] text-muted truncate" title={"@" + user.username}>@{user.username}</div>
                {user.role !== "viewer" && (
                  <div className="text-[10px] text-muted capitalize mt-0.5">{user.role}</div>
                )}
              </div>

              <DropdownLink href="/settings" className="text-wiki-link" onClick={() => setOpen(false)}>
                settings
              </DropdownLink>

              {isAdmin && (
                <>
                  <div className="border-t border-border my-1" />
                  <DropdownLink href="/admin" className="text-wiki-link" onClick={() => setOpen(false)}>
                    admin panel
                  </DropdownLink>
                </>
              )}

              <div className="border-t border-border my-1" />
              <DropdownItem onClick={handleLogout} className="text-wiki-link">
                log out
              </DropdownItem>
            </>
          ) : (
            <>
              <DropdownLink href="/login" className="text-wiki-link" onClick={() => setOpen(false)}>
                log in
              </DropdownLink>
              {registrationOpen && <DropdownLink href="/register" className="text-wiki-link" onClick={() => setOpen(false)}>
                register
              </DropdownLink>}
            </>
          )}
        </Dropdown>
      )}
    </div>
  );
}
