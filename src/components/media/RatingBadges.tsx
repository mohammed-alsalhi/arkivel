import type { AggregatedRatings } from '@/media/types'

export default function RatingBadges({ ratings }: { ratings: AggregatedRatings }) {
  const items = [
    { label: 'IMDB', value: ratings.imdb, color: 'text-yellow-400' },
    { label: 'RT', value: ratings.rotten_tomatoes, color: 'text-red-400' },
    { label: 'MC', value: ratings.metacritic, color: 'text-green-400' },
  ].filter((r) => r.value)

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ label, value, color }) => (
        <span key={label} className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground text-xs">{label}</span>
          <span className={`font-semibold ${color}`}>{value}</span>
        </span>
      ))}
    </div>
  )
}
