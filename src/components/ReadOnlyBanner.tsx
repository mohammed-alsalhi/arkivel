export default function ReadOnlyBanner() {
  return (
    <div className="bg-info-soft border-b border-info-border px-4 py-2 text-center text-[12px] text-info flex items-center justify-center gap-2">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span>
        <strong>Read-only mode is active.</strong> Article editing is temporarily disabled for non-admin users.
      </span>
    </div>
  );
}
