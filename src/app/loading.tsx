import { SkeletonText, SkeletonTable } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="ui-page" aria-busy="true" aria-label="Loading page">
      <div className="ui-topbar" aria-hidden="true">
        <div className="skeleton skeleton-text-sm w-48" />
      </div>
      <div className="ui-page-body">
        <div className="ui-page-header">
          <div className="ui-page-header-copy w-full max-w-md">
            <SkeletonText lines={2} />
          </div>
        </div>
        <SkeletonTable rows={6} />
      </div>
    </div>
  );
}
