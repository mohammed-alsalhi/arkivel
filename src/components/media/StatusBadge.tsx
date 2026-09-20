import type { WatchStatus } from '@/media/types'

export const STATUS_LABELS: Record<WatchStatus, string> = {
  plan_to_watch: 'To watch', watching: 'Watching', watched: 'Watched', dropped: 'Dropped',
}
const colors = { plan_to_watch: 'bg-sky-400', watching: 'bg-primary', watched: 'bg-emerald-400', dropped: 'bg-zinc-500' }

export default function StatusBadge({ status }: { status: WatchStatus }) {
  return <span className="inline-flex h-4 items-center gap-1.5 whitespace-nowrap text-xs leading-4 text-muted-foreground"><span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${colors[status]}`} />{STATUS_LABELS[status]}</span>
}
