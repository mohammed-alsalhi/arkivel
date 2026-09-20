export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonArticleCard() {
  return (
    <div className="border border-border bg-surface p-4">
      <div className="skeleton skeleton-title" />
      <SkeletonText lines={2} />
      <div className="flex gap-2 mt-3">
        <div className="skeleton" style={{ width: 60, height: 20 }} />
        <div className="skeleton" style={{ width: 40, height: 20 }} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-border bg-surface">
      <div className="skeleton" style={{ height: 36, width: "100%" }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-3 py-2 border-t border-border-light">
          <div className="skeleton" style={{ height: 16, flex: 3 }} />
          <div className="skeleton" style={{ height: 16, flex: 1 }} />
          <div className="skeleton" style={{ height: 16, flex: 1 }} />
        </div>
      ))}
    </div>
  );
}
