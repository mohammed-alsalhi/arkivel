"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type Props = {
  articleId: string;
  revisionId: string;
};

export default function RestoreRevisionButton({ articleId, revisionId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  async function handleRestore() {
    if (!confirm("restore this revision? the current content is saved as a new revision first.")) return;
    setLoading(true);
    const res = await fetch(`/api/articles/${articleId}/revisions/${revisionId}/restore`, {
      method: "POST",
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
      addToast("revision restored", "success");
    } else {
      const data = await res.json().catch(() => ({}));
      addToast(data.error || "unable to restore this revision. try again.", "error");
    }
  }

  return (
    <button
      onClick={handleRestore}
      disabled={loading}
      className="text-wiki-link text-[12px] hover:underline disabled:opacity-50"
    >
      {loading ? "restoring…" : "restore"}
    </button>
  );
}