"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/AdminContext";
import { useConfirm } from "@/lib/useConfirm";
import { useToast } from "@/components/Toast";

export default function DuplicateArticleButton({ articleId }: { articleId: string }) {
  const isAdminUser = useAdmin();
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isAdminUser) return null;

  async function handleDuplicate() {
    if (!(await confirm("Duplicate this article? A copy will be created as a draft.", { title: "Duplicate article", confirmLabel: "Duplicate" }))) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/duplicate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        router.push(`/articles/${data.slug}/edit`);
      } else {
        addToast("Failed to duplicate article.", "error");
        setLoading(false);
      }
    } catch {
      addToast("Failed to duplicate article.", "error");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleDuplicate}
        disabled={loading}
        className="ui-button disabled:opacity-50"
        title="Duplicate this article as a new draft"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {loading ? "Duplicating…" : "Duplicate"}
      </button>
      {confirmDialog}
    </>
  );
}
