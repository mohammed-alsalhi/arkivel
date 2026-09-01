"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/lib/useConfirm";
import { useToast } from "@/components/Toast";

type Props = {
  articleId: string;
  revisionId: string;
};

export default function RestoreRevisionButton({ articleId, revisionId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const { addToast } = useToast();

  async function handleRestore() {
    if (!(await confirm("Restore this revision? The current content will be saved as a new revision before restoring.", { title: "Restore revision", confirmLabel: "Restore" }))) return;
    setLoading(true);
    const res = await fetch(`/api/articles/${articleId}/revisions/${revisionId}/restore`, {
      method: "POST",
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
      addToast("Revision restored successfully.", "success");
    } else {
      const data = await res.json().catch(() => ({}));
      addToast(data.error || "Failed to restore revision.", "error");
    }
  }

  return (
    <>
      <button
        onClick={handleRestore}
        disabled={loading}
        className="text-wiki-link text-[12px] hover:underline disabled:opacity-50"
      >
        {loading ? "Restoring…" : "restore"}
      </button>
      {confirmDialog}
    </>
  );
}
