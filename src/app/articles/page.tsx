"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/AdminContext";
import ArticleStatusBadge from "@/components/ArticleStatusBadge";
import { DataTable, EmptyState, LinkButton, LoadingState, Page, PageHeader, SectionPanel } from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";
import { useToast } from "@/components/Toast";

export default function ArticlesPageWrapper() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ArticlesPageContent />
    </Suspense>
  );
}

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published: boolean;
  status: string;
  updatedAt: string;
  category: { id: string; slug: string; name: string } | null;
  tags: { tag: { id: string; slug: string; name: string } }[];
};

type Category = {
  id: string;
  slug: string;
  name: string;
};

type Tag = {
  id: string;
  slug: string;
  name: string;
};

function ArticlesPageContent() {
  const isAdmin = useAdmin();
  const { confirm, confirmDialog } = useConfirm();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";
  const tag = searchParams.get("tag") || "";
  const statusFilter = searchParams.get("status") || "";
  const pageStr = searchParams.get("page") || "1";
  const page = parseInt(pageStr);

  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState("");
  const [batchCategoryId, setBatchCategoryId] = useState("");
  const [batchTagId, setBatchTagId] = useState("");
  const [batchWorking, setBatchWorking] = useState(false);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const loadData = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    const [articlesRes, catsRes, tagsRes] = await Promise.all([
      fetch(`/api/articles?${params}`),
      fetch("/api/categories"),
      fetch("/api/tags"),
    ]);

    if (articlesRes.ok) {
      const data = await articlesRes.json();
      setArticles(data.articles);
      setTotal(data.total);
    }
    if (catsRes.ok) {
      const cats = await catsRes.json();
      // Flatten nested categories
      const flat: Category[] = [];
      function flatten(list: (Category & { children?: Category[] })[]) {
        for (const c of list) {
          flat.push({ id: c.id, slug: c.slug, name: c.name });
          if (c.children) flatten(c.children);
        }
      }
      flatten(cats);
      setCategories(flat);
    }
    if (tagsRes.ok) {
      setTags(await tagsRes.json());
    }
    setLoading(false);
  }, [category, tag, statusFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === articles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(articles.map((a) => a.id)));
    }
  }

  async function handleBatchAction() {
    if (!selected.size) return;
    const ids = Array.from(selected);

    if (batchAction === "delete") {
      if (!(await confirm(`Delete ${ids.length} article${ids.length > 1 ? "s" : ""}? This cannot be undone.`, { title: "Delete articles", confirmLabel: "Delete", danger: true }))) return;
      setBatchWorking(true);
      const res = await fetch("/api/articles/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        await loadData();
        setBatchAction("");
      } else {
        addToast("Failed to delete articles", "error");
      }
      setBatchWorking(false);
      return;
    }

    if (batchAction === "setCategory") {
      setBatchWorking(true);
      const res = await fetch("/api/articles/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "setCategory", categoryId: batchCategoryId || null }),
      });
      if (res.ok) {
        await loadData();
        setBatchAction("");
      } else {
        addToast("Failed to update category", "error");
      }
      setBatchWorking(false);
      return;
    }

    if (batchAction === "publish" || batchAction === "unpublish") {
      setBatchWorking(true);
      const res = await fetch("/api/articles/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: batchAction }),
      });
      if (res.ok) {
        await loadData();
        setBatchAction("");
      } else {
        addToast("Failed to update articles", "error");
      }
      setBatchWorking(false);
      return;
    }

    if (batchAction === "addTag" || batchAction === "removeTag") {
      if (!batchTagId) return;
      setBatchWorking(true);
      const res = await fetch("/api/articles/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: batchAction, tagId: batchTagId }),
      });
      if (res.ok) {
        await loadData();
        setBatchAction("");
        setBatchTagId("");
      } else {
        addToast("Failed to update tags", "error");
      }
      setBatchWorking(false);
      return;
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <Page>
      <PageHeader
        kicker="Browse"
        title="All articles"
        description={
          <>
            {total} article{total !== 1 ? "s" : ""} in the encyclopedia
            {category && <> - filtered by category</>}
            {tag && <> - filtered by tag</>}
          </>
        }
        actions={
          <>
            <LinkButton href="/articles/new" variant="primary">Create article</LinkButton>
            <LinkButton href="/recent-changes">Recent changes</LinkButton>
          </>
        }
      />

      {/* Filters */}
      <SectionPanel title="Browse filters" bodyClassName="space-y-3">
          <div>
            <p className="ui-label">Category</p>
            <div className="flex flex-wrap gap-1.5">
              <Link
                href="/articles"
                className={`ui-chip hover:no-underline ${!category && !tag ? "ui-chip-info" : ""}`}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/articles?category=${cat.slug}`}
                  className={`ui-chip hover:no-underline ${category === cat.slug ? "ui-chip-info" : ""}`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <p className="ui-label">Tag</p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">
                {tags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/articles?tag=${t.slug}`}
                    className={`ui-chip hover:no-underline ${tag === t.slug ? "ui-chip-info" : ""}`}
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
      </SectionPanel>

      {/* Article list */}
      {loading ? (
        <LoadingState />
      ) : articles.length === 0 ? (
        <EmptyState>
          No articles found. <Link href="/articles/new">Create one.</Link>
        </EmptyState>
      ) : (
        <DataTable>
            <thead>
              <tr>
                {isAdmin && (
                  <th className="w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selected.size === articles.length && articles.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th>Article</th>
                <th className="w-32">Category</th>
                <th className="w-28">Last edited</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  {isAdmin && (
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(article.id)}
                        onChange={() => toggleSelect(article.id)}
                      />
                    </td>
                  )}
                  <td>
                    <Link href={`/articles/${article.slug}`} className="font-medium">
                      {article.title}
                    </Link>
                    {article.status !== "published" && (
                      <span className="ml-2"><ArticleStatusBadge status={article.status} /></span>
                    )}
                    {article.excerpt && (
                      <span className="text-muted text-[12px]">
                        {" "}&ndash; {article.excerpt.substring(0, 100)}{article.excerpt.length > 100 ? "..." : ""}
                      </span>
                    )}
                  </td>
                  <td className="text-muted">
                    {article.category ? (
                      <Link href={`/categories/${article.category.slug}`}>
                        {article.category.name}
                      </Link>
                    ) : (
                      <span className="italic">None</span>
                    )}
                  </td>
                  <td className="text-muted text-[12px]">
                    {formatDate(article.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
        </DataTable>
      )}

      {/* Batch action bar */}
      {isAdmin && selected.size > 0 && (
        <div className="mt-3 border border-border bg-surface-hover px-3 py-2 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="font-bold text-heading">{selected.size} selected</span>
          <select
            value={batchAction}
            onChange={(e) => setBatchAction(e.target.value)}
            className="ui-select w-auto"
          >
            <option value="">Choose action...</option>
            <option value="setCategory">Set category</option>
            <option value="addTag">Add tag</option>
            <option value="removeTag">Remove tag</option>
            <option value="publish">Publish</option>
            <option value="unpublish">Unpublish</option>
            <option value="delete">Delete</option>
          </select>
          {batchAction === "setCategory" && (
            <select
              value={batchCategoryId}
              onChange={(e) => setBatchCategoryId(e.target.value)}
              className="ui-select w-auto"
            >
              <option value="">None (remove category)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
          {(batchAction === "addTag" || batchAction === "removeTag") && (
            <select
              value={batchTagId}
              onChange={(e) => setBatchTagId(e.target.value)}
              className="ui-select w-auto"
            >
              <option value="">Select tag…</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleBatchAction}
            disabled={!batchAction || batchWorking || ((batchAction === "addTag" || batchAction === "removeTag") && !batchTagId)}
            className={`ui-button disabled:opacity-50 ${
              batchAction === "delete" ? "ui-button-danger" : "ui-button-primary"
            }`}
          >
            {batchWorking ? "Working..." : "Apply"}
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-3 text-[13px] text-muted">
          Pages:{" "}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <span key={p}>
              {p > 1 && " | "}
              <Link
                href={`/articles?${new URLSearchParams({
                  ...(category ? { category } : {}),
                  ...(tag ? { tag } : {}),
                  page: p.toString(),
                })}`}
                className={p === page ? "font-bold" : ""}
              >
                {p}
              </Link>
            </span>
          ))}
        </div>
      )}
      {confirmDialog}
    </Page>
  );
}
