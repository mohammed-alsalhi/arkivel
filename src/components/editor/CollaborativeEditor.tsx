"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import TiptapEditor, { type TiptapEditorHandle } from "./TiptapEditor";
import {
  collaborationConnectionStates,
  formatLastSaved,
  getCollaborationConnectionState,
} from "@/lib/collaboration-ux";

type User = {
  id: string;
  name: string;
  color: string;
  isMe: boolean;
};

type Props = {
  articleId: string;
  initialHtml?: string;
  articleTitle?: string;
  onHtmlChange?: (html: string) => void;
  editorRef?: React.RefObject<TiptapEditorHandle | null>;
};

const SYNC_INTERVAL_MS = 2000;
const PRESENCE_INTERVAL_MS = 10000;

export default function CollaborativeEditor({ articleId, initialHtml, articleTitle, onHtmlChange, editorRef }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [remoteChangedWhilePending, setRemoteChangedWhilePending] = useState(false);
  const [hasPendingLocalChanges, setHasPendingLocalChanges] = useState(false);

  const ydocRef = useRef<Y.Doc | null>(null);
  const localEditorRef = useRef<TiptapEditorHandle | null>(null);
  const activeEditorRef = editorRef ?? localEditorRef;
  const pendingUpdateRef = useRef(false);
  const serverStateRef = useRef<Uint8Array | null>(null);

  const syncToServer = useCallback(async () => {
    if (!enabled || !ydocRef.current || !activeEditorRef.current) return;
    setSyncing(true);
    setSyncError(false);
    try {
      // Get current editor HTML and encode as Yjs update
      const html = activeEditorRef.current.getHTML();
      const ydoc = ydocRef.current;

      // Encode the current state as an update
      const update = Y.encodeStateAsUpdate(ydoc);
      const b64 = Buffer.from(update).toString("base64");

      const res = await fetch(`/api/collab/${articleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update: b64, html }),
      });

      if (res.ok) {
        const data = await res.json();
        const remoteState = Buffer.from(data.state, "base64");

        // Apply remote changes if they're newer
        const remoteDoc = new Y.Doc();
        Y.applyUpdate(remoteDoc, remoteState);

        // Check if remote has changes we don't have
        const diffUpdate = Y.diffUpdate(remoteState, Y.encodeStateVector(ydoc));
        if (diffUpdate.length > 2) {
          setRemoteChangedWhilePending(pendingUpdateRef.current);
          // There are remote changes — apply them
          Y.applyUpdate(ydoc, diffUpdate);
          serverStateRef.current = remoteState;
          pendingUpdateRef.current = false;
          setHasPendingLocalChanges(false);
        } else {
          setRemoteChangedWhilePending(false);
          pendingUpdateRef.current = false;
          setHasPendingLocalChanges(false);
        }
        setLastSynced(new Date());
      } else {
        setSyncError(true);
      }
    } catch {
      setSyncError(true);
    }
    setSyncing(false);
  }, [enabled, articleId, activeEditorRef]);

  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

  // Initialize Yjs doc and load server state
  useEffect(() => {
    if (!enabled) return;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    fetch(`/api/collab/${articleId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.state) {
          const state = Buffer.from(data.state, "base64");
          Y.applyUpdate(ydoc, state);
          serverStateRef.current = state;
        }
      })
      .catch(() => {});

    return () => { ydoc.destroy(); ydocRef.current = null; };
  }, [articleId, enabled]);

  // Sync loop
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(syncToServer, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, syncToServer]);

  // Presence loop
  useEffect(() => {
    if (!enabled) return;

    async function updatePresence() {
      const res = await fetch(`/api/collab/${articleId}/presence`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    }

    updatePresence();
    const interval = setInterval(updatePresence, PRESENCE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      // Signal departure
      fetch(`/api/collab/${articleId}/presence`, { method: "DELETE" }).catch(() => {});
    };
  }, [articleId, enabled]);

  const otherUsers = users.filter((u) => !u.isMe);
  const connectionState = getCollaborationConnectionState({
    enabled,
    syncing,
    syncError,
    hasPendingLocalChanges,
    remoteChangedWhilePending,
    online,
  });
  const connection = collaborationConnectionStates[connectionState];
  const visibleUsers = otherUsers.slice(0, 4);
  const overflowCount = Math.max(0, otherUsers.length - visibleUsers.length);

  return (
    <div>
      {/* Collab toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1" aria-live="polite">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            onClick={() => setEnabled((v) => !v)}
            className={`h-6 pointer-coarse:h-9 px-2 text-[11px] border rounded transition-colors flex items-center gap-1 ${
              enabled
                ? "border-success-border text-success bg-success-soft hover:border-success"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-success animate-pulse" : "bg-muted"}`} />
            {enabled ? "Live" : "Enable live editing"}
          </button>

          <span
            className={`h-6 pointer-coarse:h-9 px-2 text-[11px] border rounded flex items-center gap-1 ${
              connection.severity === "danger"
                ? "border-danger-border text-danger bg-danger-soft"
                : connection.severity === "warning"
                  ? "border-warning-border text-warning bg-warning-soft"
                  : connection.severity === "success"
                    ? "border-success-border text-success bg-success-soft"
                    : "border-border text-muted bg-surface"
            }`}
            title={connection.description}
          >
            {connection.label}
          </span>

          {enabled && otherUsers.length > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Active collaborators">
              {visibleUsers.map((u) => (
                <span
                  key={u.id}
                  title={`${u.name} is editing`}
                  aria-label={`${u.name} is editing`}
                  className="flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold"
                  style={{ background: u.color }}
                >
                  {u.name[0]?.toUpperCase()}
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-hover text-[10px] font-bold text-muted">
                  +{overflowCount}
                </span>
              )}
              <span className="text-[11px] text-muted ml-1">
                {otherUsers.map((user) => user.name).join(", ")}
              </span>
            </div>
          )}

          {enabled && otherUsers.length === 0 && (
            <span className="text-[11px] text-muted">Only you</span>
          )}
        </div>

        {enabled && (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-muted">
            {syncing && (
              <svg className="w-3 h-3 animate-spin text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {remoteChangedWhilePending && <span className="text-warning">Review remote changes before publishing</span>}
            <span>{formatLastSaved(lastSynced)}</span>
            <button
              onClick={syncToServer}
              className="text-accent hover:underline"
            >
              Sync now
            </button>
          </div>
        )}
      </div>

      <TiptapEditor
        ref={activeEditorRef}
        content={initialHtml}
        placeholder="Begin writing your article…"
        articleTitle={articleTitle}
        onUpdate={() => {
          pendingUpdateRef.current = enabled;
          setHasPendingLocalChanges(enabled);
          onHtmlChange?.(activeEditorRef.current?.getHTML() ?? "");
        }}
      />
    </div>
  );
}
