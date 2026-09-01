export default function MaintenanceBanner() {
  return (
    <div className="bg-warning-soft border-b border-warning-border px-4 py-2 text-center text-[12px] text-warning flex items-center justify-center gap-2">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>
        <strong>Maintenance mode is active.</strong> The wiki is undergoing maintenance — some features may be temporarily unavailable.
      </span>
    </div>
  );
}
