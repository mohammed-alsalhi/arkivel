'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Grid2X2, List, Plus, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Button, buttonVariants } from '@/components/media/ui/button'
import WatchlistCard from '@/components/media/WatchlistCard'
import Poster from '@/components/media/Poster'
import { STATUS_LABELS } from '@/components/media/StatusBadge'
import { api, type LibraryHealth } from '@/lib/media-client'
import { cn } from '@/components/media/cn'
import { MOODS, type WatchlistItem, type WatchStatus, type MediaType, type Mood } from '@/media/types'

const tabs: { value: 'all' | WatchStatus; label: string }[] = [{ value: 'all', label: 'All titles' }, ...(['plan_to_watch', 'watching', 'watched', 'dropped'] as WatchStatus[]).map(value => ({ value, label: STATUS_LABELS[value] }))]

export default function LibraryPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [health, setHealth] = useState<LibraryHealth | null>(null)
  const [status, setStatus] = useState<'all' | WatchStatus>('all')
  const [mediaType, setMediaType] = useState<'all' | MediaType>('all')
  const [mood, setMood] = useState<'all' | Mood>('all')
  const [sort, setSort] = useState('recent')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api<WatchlistItem[]>('/api/media/watchlist', { signal: controller.signal }), api<LibraryHealth>('/api/media/health', { signal: controller.signal })])
      .then(([items, health]) => { setItems(items); setHealth(health); setError(''); setLoading(false) })
      .catch(error => { if (!controller.signal.aborted) { setError(error.message); setLoading(false) } })
    return () => controller.abort()
  }, [attempt])

  const sorted = items.filter(item => (status === 'all' || item.status === status) && (mediaType === 'all' || item.media_type === mediaType) && (mood === 'all' || item.moods.includes(mood)))
    .sort((a, b) => sort === 'az' ? a.title.localeCompare(b.title) : sort === 'rating' ? (b.metadata?.vote_average || 0) - (a.metadata?.vote_average || 0) : b.added_at.localeCompare(a.added_at))
  const continuing = items.filter(item => item.status === 'watching' && item.media_type === 'tv').slice(0, 3)
  const queued = items.filter(item => item.status === 'plan_to_watch')
  const featured = queued.find(item => item.tmdb_id === 693134 && item.media_type === 'movie') || queued[0]
  const filtered = status !== 'all' || mediaType !== 'all' || mood !== 'all'
  const metadata = featured?.metadata
  const runtime = metadata?.runtime

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="page-heading">Good evening. What’s next?</h1><p className="muted mt-1.5">Your next great watch is already here.</p></div>
        <Link href="/search" className={buttonVariants()}><Plus aria-hidden="true" />Add a title</Link>
      </div>
      {error ? <div role="alert" className="error-message flex flex-wrap items-center justify-between gap-3"><span>{error}</span><Button variant="outline" onClick={() => { setLoading(true); setAttempt(attempt + 1) }}><RotateCcw />Try again</Button></div> : null}
      {loading ? <div aria-label="Loading your library" className="space-y-7"><div className="h-[285px] rounded-xl bg-muted animate-pulse" /><div className="grid grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />)}</div></div> : !error && <>
        {featured && <section aria-label="Featured from your watchlist" className="image-outline relative isolate min-h-[280px] overflow-hidden rounded-xl bg-card sm:min-h-[265px]">
          <div className="absolute inset-0 -z-10"><Poster path={metadata?.backdrop_path || featured.poster_path} backdrop priority alt="" /></div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/95 via-black/65 to-black/5" />
          <div className="max-w-[640px] px-6 py-7 sm:px-8 sm:py-6">
            <p className="eyebrow text-white/75">From your watchlist</p>
            <h2 className="mt-3 text-[32px] leading-tight font-semibold tracking-[-0.04em] sm:text-[38px]">{featured.title}</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-white/70 sm:text-sm"><span>{(metadata?.release_date || metadata?.first_air_date || '').slice(0, 4)}</span>{runtime ? <><span>·</span><span>{Math.floor(runtime / 60)}h {runtime % 60}m</span></> : null}{metadata?.genres?.length ? <><span>·</span><span>{metadata.genres.slice(0, 2).map(g => g.name).join(', ')}</span></> : null}</p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80">{featured.tmdb_id === 693134 ? 'Some destinies are written in sand.' : metadata?.overview?.slice(0, 130) || 'A little less deciding. A little more watching.'}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/item/${featured.tmdb_id}?type=${featured.media_type}`} className={buttonVariants({ variant: 'secondary' })}>View {featured.media_type === 'movie' ? 'film' : 'series'}<ArrowRight className="ml-2" aria-hidden="true" /></Link>
              <Link href="/mood" className={cn(buttonVariants({ variant: 'outline' }), 'border-white/30! bg-black/20! text-white hover:bg-white/10!')}><Sparkles aria-hidden="true" />Pick for my mood</Link>
            </div>
          </div>
        </section>}
        {continuing.length > 0 && <section aria-labelledby="continue-heading">
          <div className="mb-3 flex items-center justify-between"><h2 id="continue-heading" className="section-heading">Continue watching</h2><button className="flex min-h-10 items-center gap-2 text-xs text-primary" onClick={() => { setStatus('watching'); setMediaType('all'); setMood('all'); document.getElementById('watchlist')?.scrollIntoView({ block: 'start' }) }}>View all<ArrowRight size={14} aria-hidden="true" /></button></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {continuing.map(item => <Link key={item.id} href={`/item/${item.tmdb_id}?type=tv#episodes`} className="image-outline group relative isolate h-[165px] overflow-hidden rounded-lg lg:h-[162px]">
              <div className="absolute inset-0 -z-10"><Poster path={item.metadata?.backdrop_path || item.poster_path} backdrop alt="" sizes="(max-width: 640px) 90vw, 30vw" /></div>
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/10 to-transparent" />
              <div className="flex h-full flex-col justify-end p-4">
                <div className="flex items-center gap-2"><h3 title={item.title} className="h-10 min-w-0 flex-1 line-clamp-2 text-sm leading-5 font-medium text-white [overflow-wrap:anywhere]">{item.title}</h3><ArrowRight size={16} className="shrink-0 text-white/70" aria-hidden="true" /></div>
                <p className="mt-1 h-4 truncate text-[11px] leading-4 text-white/70 tabular-nums">{item.total_episodes ? `${item.metadata?.episode_scope ? 'Sample season · ' : ''}${item.episodes_watched || 0} of ${item.total_episodes} watched` : 'Keep your story going'}</p>
                {item.total_episodes ? <div role="progressbar" aria-label={`${item.title} episode progress`} aria-valuemin={0} aria-valuemax={item.total_episodes} aria-valuenow={item.episodes_watched || 0} className="mt-2.5 h-0.5 overflow-hidden rounded-full bg-white/25"><div className="h-full bg-primary" style={{ width: `${Math.min(100, ((item.episodes_watched || 0) / item.total_episodes) * 100)}%` }} /></div> : <div className="mt-2.5 h-0.5 bg-white/20" />}
              </div>
            </Link>)}
          </div>
        </section>}
        <section id="watchlist" aria-labelledby="watchlist-heading" className="scroll-mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1"><h2 id="watchlist-heading" className="section-heading">Your watchlist</h2><span className="text-xs text-muted-foreground tabular-nums">{items.length} titles</span>{health?.sample_library && <span className="ml-auto text-[10px] text-muted-foreground">Includes sample titles · changes are saved</span>}</div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border">
            <div role="group" aria-label="Filter by watch status" className="-mb-px flex max-w-full overflow-x-auto">
              {tabs.map(tab => <button key={tab.value} onClick={() => setStatus(tab.value)} aria-pressed={status === tab.value} className={cn('min-h-11 shrink-0 border-b-2 px-2.5 text-xs transition-colors duration-150 first:pl-0', status === tab.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{tab.label}</button>)}
            </div>
            <div className="mb-2 flex max-w-full flex-wrap items-center gap-2">
              <select aria-label="Filter by type" className="field h-10 text-xs" value={mediaType} onChange={event => setMediaType(event.target.value as 'all' | MediaType)}><option value="all">All types</option><option value="movie">Films</option><option value="tv">Series</option></select>
              <select aria-label="Filter by mood" className="field h-10 max-w-36 text-xs" value={mood} onChange={event => setMood(event.target.value as 'all' | Mood)}><option value="all">All moods</option>{MOODS.map(m => <option key={m}>{m}</option>)}</select>
              <select aria-label="Sort titles" className="field h-10 max-w-40 text-xs" value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Recently added</option><option value="az">Title A–Z</option><option value="rating">Highest rated</option></select>
              <div aria-label="Library display" role="group" className="flex rounded-lg border border-border p-0.5"><Button static variant="ghost" size="icon-sm" aria-label="Grid view" aria-pressed={view === 'grid'} className={cn('size-10', view === 'grid' && 'bg-primary/10 text-primary!')} onClick={() => setView('grid')}><Grid2X2 /></Button><Button static variant="ghost" size="icon-sm" aria-label="List view" aria-pressed={view === 'list'} className={cn('size-10', view === 'list' && 'bg-primary/10 text-primary!')} onClick={() => setView('list')}><List /></Button></div>
            </div>
          </div>
          {sorted.length > 0 ? <div className={view === 'grid' ? 'poster-grid' : 'grid gap-x-8 lg:grid-cols-2'}>{sorted.map(item => <WatchlistCard key={item.id} item={item} list={view === 'list'} />)}</div> : <div className="flex min-h-64 flex-col items-center justify-center gap-4 py-12 text-center"><div className="rounded-full bg-muted p-4">{filtered ? <SlidersHorizontal className="text-muted-foreground" /> : <BookOpen className="text-primary" />}</div><div><h3 className="text-lg font-medium">{filtered ? 'No titles in this scene.' : 'A great collection starts with one title.'}</h3><p className="muted mt-2">{filtered ? 'Try a different filter to find your next watch.' : 'Save a film you love, or discover one you haven’t met yet.'}</p></div>{filtered ? <Button variant="outline" onClick={() => { setStatus('all'); setMediaType('all'); setMood('all') }}>Clear filters</Button> : <Link href="/search" className={buttonVariants()}><Plus />Find your first title</Link>}</div>}
        </section>
      </>}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-[10px] text-muted-foreground"><span>A little less scrolling. A little more cinema.</span><span>Artwork & metadata from TMDB. Not endorsed by TMDB.</span></footer>
    </div>
  )
}
