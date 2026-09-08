import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import Poster from '@/components/media/Poster'
import StatusBadge from '@/components/media/StatusBadge'
import type { WatchlistItem } from '@/media/types'

export default function WatchlistCard({ item, list = false }: { item: WatchlistItem; list?: boolean }) {
  const year = (item.metadata?.release_date || item.metadata?.first_air_date || '').slice(0, 4)
  return (
    <Link href={`/item/${item.tmdb_id}?type=${item.media_type}`} className={list ? 'group flex items-center gap-4 border-b border-border py-3' : 'group block min-w-0 rounded-lg'}>
      <div className={list ? 'h-24 w-16 shrink-0 overflow-hidden rounded-md image-outline' : 'relative aspect-[2/3] overflow-hidden rounded-lg image-outline'}>
        <Poster path={item.poster_path} alt={item.title} sizes={list ? '64px' : undefined} />
        {!list && <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-150 group-hover:bg-black/10" />}
      </div>
      <div className={list ? 'grid min-w-0 flex-1 gap-1.5' : 'mt-3 grid min-w-0 gap-1.5'}>
        <p title={item.title} className="h-10 line-clamp-2 text-[13px] leading-5 font-medium [overflow-wrap:anywhere] transition-colors duration-150 group-hover:text-primary">{item.title}</p>
        <p className="h-4 truncate text-xs leading-4 text-muted-foreground">{year && `${year} · `}{item.media_type === 'tv' ? 'Series' : 'Film'}</p>
        <StatusBadge status={item.status} />
      </div>
      {list && <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </Link>
  )
}
