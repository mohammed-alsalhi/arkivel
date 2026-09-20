"use client";

import Link from "next/link";
import { useAdmin } from "@/components/AdminContext";

export default function AdminEditTab({ slug, className = "wiki-tab" }: { slug: string; className?: string }) {
  const isAdmin = useAdmin();
  if (!isAdmin) return null;

  return (
    <Link href={`/articles/${slug}/edit`} className={className}>
      Edit
    </Link>
  );
}
