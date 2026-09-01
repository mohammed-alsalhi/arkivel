const LABELS: Record<string, string> = {
  "needs-images": "Needs images",
  "needs-expansion": "Needs expansion",
  "needs-citations": "Needs citations",
  "needs-review": "Needs review",
  "stub": "Stub article",
  "outdated": "May be outdated",
};

export default function CleanupTagsBanner({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="wiki-notice border-l-3 border-l-warning flex items-start gap-2 text-[12px]">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <div>
        <strong>This article needs attention: </strong>
        {tags.map((t, i) => (
          <span key={t}>
            {i > 0 && " · "}
            <span className="text-warning">{LABELS[t] ?? t}</span>
          </span>
        ))}
        . Help improve it by editing the article.
      </div>
    </div>
  );
}
