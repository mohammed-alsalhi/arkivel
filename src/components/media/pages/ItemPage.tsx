'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, BookmarkCheck, Check, ChevronDown, Clock3, Plus, RefreshCw, Star, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/media/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/media/ui/dialog'
import Poster from '@/components/media/Poster'
import StatusBadge from '@/components/media/StatusBadge'
import RatingBadges from '@/components/media/RatingBadges'
import { api, type LibraryHealth } from '@/lib/media-client'
import { MOODS, type WatchlistItem, type WatchStatus, type TmdbMovie, type TmdbShow, type TmdbSeason, type EpisodeProgress, type AggregatedRatings, type Mood } from '@/media/types'

const STATUSES: Record<WatchStatus, string> = {
  plan_to_watch: 'Want to watch', watching: 'Watching', watched: 'Watched', dropped: 'Dropped',
}

type Detail = {
  tmdb: TmdbMovie | TmdbShow
  ratings: AggregatedRatings
  seasons?: TmdbSeason[]
  source?: 'catalog' | 'tmdb'
  notice?: string
  episode_scope?: string
}

function LoadingDetail() {
  return <div aria-label="Loading title" role="status" className="space-y-8"><div className="h-11 w-36 rounded-lg bg-muted" /><div className="h-[470px] rounded-2xl bg-muted motion-safe:animate-pulse" /><div className="h-32 max-w-2xl rounded-xl bg-muted" /><span className="sr-only">Loading title…</span></div>
}

function LoginNotice({ className = '' }: { className?: string }) {
  return <p className={`text-sm leading-6 text-muted-foreground ${className}`}>Log in to edit your library. <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-primary">Log in</Link></p>
}

export default function ItemPage({ id, type }: { id: string; type?: string }) {
  const mediaType = type ?? 'movie'
  return <ItemContent key={`${id}:${mediaType}`} id={id} mediaType={mediaType} />
}

function ItemContent({ id, mediaType }: { id: string; mediaType: string }) {
  const validRoute = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) && (mediaType === 'movie' || mediaType === 'tv')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [item, setItem] = useState<WatchlistItem | null>(null)
  const [progress, setProgress] = useState<EpisodeProgress[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [retry, setRetry] = useState(0)
  const [removeOpen, setRemoveOpen] = useState(false)
  const mutationLock = useRef(false)
  const errorAlert = useRef<HTMLDivElement>(null)
  const retryAction = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => { if (error && !removeOpen) errorAlert.current?.focus() }, [error, removeOpen])

  useEffect(() => {
    if (!validRoute) return
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setLoadError('')
      setError('')
      try {
        const [data, library, health] = await Promise.all([
          api<Detail>(`/api/media/tmdb/${id}?type=${mediaType}&seasons=1`, { signal: controller.signal }),
          api<WatchlistItem[]>('/api/media/watchlist', { signal: controller.signal }),
          api<LibraryHealth>('/api/media/health', { signal: controller.signal }),
        ])
        const saved = library.find((entry) => entry.tmdb_id === Number(id) && entry.media_type === mediaType) ?? null
        const episodes = saved && mediaType === 'tv'
          ? await api<EpisodeProgress[]>(`/api/media/watchlist/${saved.id}/episodes`, { signal: controller.signal })
          : []
        if (controller.signal.aborted) return
        setDetail(data)
        setItem(saved)
        setProgress(episodes)
        setCanEdit(health.can_edit === true)
      } catch (cause) {
        if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'We couldn’t load this title.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [id, mediaType, retry, validRoute])

  async function mutate(action: () => Promise<void>) {
    if (mutationLock.current) return
    mutationLock.current = true
    retryAction.current = action
    setSaving(true)
    setError('')
    try {
      await action()
      retryAction.current = null
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That change couldn’t be saved. Please try again.')
    } finally {
      mutationLock.current = false
      setSaving(false)
    }
  }

  function updateItem(patch: { status?: WatchStatus; moods?: Mood[] }) {
    if (!item) return
    void mutate(async () => setItem(await api<WatchlistItem>(`/api/media/watchlist/${item.id}`, { method: 'PATCH', body: JSON.stringify(patch) })))
  }

  function markEpisodes(episodes: { season_number: number; episode_number: number }[]) {
    if (!item || !episodes.length) return
    void mutate(async () => {
      const added = await api<EpisodeProgress[]>(`/api/media/watchlist/${item.id}/episodes`, { method: 'POST', body: JSON.stringify({ episodes }) })
      setProgress((current) => [...new Map([...current, ...added].map((ep) => [`${ep.season_number}:${ep.episode_number}`, ep])).values()])
      setItem((current) => current?.status === 'plan_to_watch' ? { ...current, status: 'watching' } : current)
    })
  }

  function toggleEpisode(season: number, episode: number, watched: boolean) {
    if (!item) return
    if (!watched) return markEpisodes([{ season_number: season, episode_number: episode }])
    void mutate(async () => {
      await api<void>(`/api/media/watchlist/${item.id}/episodes`, { method: 'DELETE', body: JSON.stringify({ season_number: season, episode_number: episode }) })
      setProgress((current) => current.filter((ep) => ep.season_number !== season || ep.episode_number !== episode))
    })
  }

  if (!validRoute || loadError || (!loading && !detail)) {
    return <div className="py-24 text-center"><p className="eyebrow">A little plot twist</p><h1 className="page-heading mt-3">This title couldn’t be loaded.</h1><p className="mx-auto mt-3 max-w-md text-muted-foreground">{validRoute ? loadError || 'The title may no longer be available.' : 'This link needs a valid movie or TV show ID.'}</p><div className="mt-7 flex justify-center gap-3"><Link href="/search" className={buttonVariants({ variant: 'outline' })}>Discover titles</Link>{validRoute && <Button onClick={() => setRetry((value) => value + 1)}><RefreshCw />Try again</Button>}</div></div>
  }
  if (loading || !detail) return <LoadingDetail />

  const { tmdb, ratings, source, notice, episode_scope } = detail
  const seasons = detail.seasons ?? []
  const title = 'title' in tmdb ? tmdb.title : tmdb.name
  const year = ('release_date' in tmdb ? tmdb.release_date : tmdb.first_air_date)?.slice(0, 4)
  const runtime = 'runtime' in tmdb ? tmdb.runtime : null
  const totalEpisodes = 'number_of_episodes' in tmdb ? tmdb.number_of_episodes : 0
  const watched = new Set(progress.map((ep) => `${ep.season_number}:${ep.episode_number}`))
  const sampleKeys = new Set(seasons.flatMap(season => (season.episodes ?? []).map(episode => `${season.season_number}:${episode.episode_number}`)))
  const watchedCount = source === 'catalog' ? [...watched].filter(key => sampleKeys.has(key)).length : watched.size
  const percent = totalEpisodes ? Math.min(100, Math.round(watchedCount / totalEpisodes * 100)) : 0
  const editable = canEdit && item !== null

  function addToWatchlist() {
    void mutate(async () => setItem(await api<WatchlistItem>('/api/media/watchlist', {
      method: 'POST', body: JSON.stringify({ tmdb_id: Number(id), media_type: mediaType, title, poster_path: tmdb.poster_path, status: 'plan_to_watch', moods: [] }),
    })))
  }

  return (
    <div className="mx-auto max-w-[1180px] pb-8">
      <Link href="/" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" />Your watchlist</Link>

      <section className="relative isolate flex min-h-[480px] overflow-hidden rounded-2xl bg-card sm:min-h-[500px]">
        {tmdb.backdrop_path && <Poster path={tmdb.backdrop_path} alt="" backdrop priority className="absolute inset-0 size-full object-cover" sizes="(min-width: 1024px) 80vw, 100vw" />}
        <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/50 to-black/15" />
        <div className="absolute inset-0 bg-linear-to-t from-[#111113] via-transparent to-black/10" />
        <div className="relative flex max-w-[780px] flex-col justify-end px-6 py-9 sm:px-10 sm:py-12">
          <p className="mb-4 flex items-center gap-3 text-xs font-medium tracking-[0.16em] text-white/70 uppercase"><span>{mediaType === 'tv' ? 'TV series' : 'Feature film'}</span>{year && <><span aria-hidden="true" className="size-1 rounded-full bg-white/40" /><span>{year}</span></>}</p>
          <h1 className="max-w-[660px] text-[clamp(2.4rem,5.5vw,4.5rem)] leading-[1.05] font-semibold tracking-[-0.055em] text-balance text-white">{title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
            {tmdb.vote_average > 0 && <span className="inline-flex items-center gap-1.5 tabular-nums"><Star className="size-4 text-[#ecc17b]" /><strong className="font-medium text-white">{tmdb.vote_average.toFixed(1)}</strong><span className="text-white/50">TMDB</span></span>}
            {runtime != null && runtime > 0 && <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{Math.floor(runtime / 60) > 0 ? `${Math.floor(runtime / 60)}h ` : ''}{runtime % 60 > 0 ? `${runtime % 60}m` : ''}</span>}
            {'number_of_seasons' in tmdb && tmdb.number_of_seasons > 0 && <span>{tmdb.number_of_seasons} {tmdb.number_of_seasons === 1 ? 'season' : 'seasons'}{source === 'catalog' ? ' in sample' : ''}</span>}
            {tmdb.genres?.slice(0, 3).map((genre) => <span key={genre.id}>{genre.name}</span>)}
          </div>
          <p className="mt-5 max-w-[610px] text-sm leading-7 text-pretty text-white/70 sm:text-[15px]">{tmdb.overview || 'There’s no synopsis for this title yet.'}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {item ? <a href="#your-watchlist" className={buttonVariants({ variant: 'secondary' })}><BookmarkCheck />In your watchlist</a> : canEdit ? <Button disabled={saving} onClick={addToWatchlist}><Plus />{saving ? 'Adding…' : 'Add to watchlist'}</Button> : <LoginNotice className="text-white/70!" />}
            {item && <StatusBadge status={item.status} />}
          </div>
        </div>
      </section>

      {error && !removeOpen && <div ref={errorAlert} tabIndex={-1} role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm"><p>{error}</p><Button variant="ghost" disabled={saving} onClick={() => retryAction.current && void mutate(retryAction.current)}><RefreshCw />Retry</Button></div>}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14">
        <div>
          {mediaType === 'tv' ? <section id="episodes" className="scroll-mt-6" aria-labelledby="episodes-heading">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">One episode at a time</p><h2 id="episodes-heading" className="section-heading mt-2">Your progress</h2></div>{totalEpisodes > 0 && <p className="text-sm text-muted-foreground tabular-nums"><span className="font-medium text-foreground">{watchedCount}</span> / {totalEpisodes} episodes</p>}</div>
            {totalEpisodes > 0 && <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/7" role="progressbar" aria-label="Episodes watched" aria-valuemin={0} aria-valuemax={totalEpisodes} aria-valuenow={Math.min(watchedCount, totalEpisodes)}><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>}
            {!item && canEdit && <p className="mt-5 text-sm text-muted-foreground">Add this show to your watchlist to save your episode progress.</p>}
            {!canEdit && <LoginNotice className="mt-5" />}
            {(episode_scope || notice) && <p className="mt-5 text-sm leading-6 text-muted-foreground">{episode_scope || notice}</p>}
            {seasons.length === 0 && <div className="mt-6 rounded-xl border border-dashed border-border p-7 text-sm leading-6 text-muted-foreground">Episode details aren’t available for this show yet. You can still track its overall watch status.</div>}
            <div className="mt-5 divide-y divide-border">
              {seasons.map((season, index) => {
                const episodes = season.episodes ?? []
                const seasonWatched = episodes.filter((episode) => watched.has(`${season.season_number}:${episode.episode_number}`)).length
                const complete = episodes.length > 0 && seasonWatched === episodes.length
                return <details key={season.season_number} className="group/season" open={index === 0}>
                  <summary className="flex min-h-[76px] cursor-pointer list-none items-center gap-4 rounded-lg py-4 text-sm outline-offset-4 [&::-webkit-details-marker]:hidden"><span className="flex-1 font-medium">{season.name || `Season ${season.season_number}`}</span><span className="text-xs text-muted-foreground tabular-nums">{seasonWatched} / {season.episode_count || episodes.length}</span>{complete && <Check className="size-4 text-emerald-400" aria-label="Season complete" />}<ChevronDown className="size-4 text-muted-foreground group-open/season:rotate-180" /></summary>
                  <div className="pb-6">
                    {editable && episodes.length > 0 && <div className="mb-3 flex justify-end"><Button variant="ghost" size="sm" disabled={saving || complete} onClick={() => markEpisodes(episodes.filter((episode) => !watched.has(`${season.season_number}:${episode.episode_number}`)).map((episode) => ({ season_number: season.season_number, episode_number: episode.episode_number })))}><Check />{complete ? 'Season complete' : 'Mark season watched'}</Button></div>}
                    {!episodes.length && <p className="pb-4 text-sm text-muted-foreground">Episode names aren’t available yet.</p>}
                    {episodes.map((episode) => {
                      const isWatched = watched.has(`${season.season_number}:${episode.episode_number}`)
                      return <label key={episode.episode_number} className={`flex min-h-[60px] items-center gap-4 rounded-lg px-3 py-3 transition-colors ${editable && !saving ? 'cursor-pointer hover:bg-white/4' : 'cursor-default'} ${isWatched ? 'text-muted-foreground' : ''}`}>
                        <input type="checkbox" checked={isWatched} disabled={!editable || saving} onChange={() => toggleEpisode(season.season_number, episode.episode_number, isWatched)} className="size-[18px] shrink-0 accent-primary" />
                        <span className="w-7 shrink-0 text-xs text-muted-foreground tabular-nums">{String(episode.episode_number).padStart(2, '0')}</span><span className="flex-1 text-sm">{episode.name}<span className="sr-only">, season {season.season_number}, episode {episode.episode_number}</span></span>{episode.runtime != null && episode.runtime > 0 && <span className="text-xs text-muted-foreground tabular-nums">{episode.runtime}m</span>}
                      </label>
                    })}
                  </div>
                </details>
              })}
            </div>
          </section> : <section aria-labelledby="about-heading"><p className="eyebrow">The details</p><h2 id="about-heading" className="section-heading mt-2">Worth a closer look.</h2><div className="mt-7 flex gap-6"><div className="relative hidden aspect-2/3 w-28 shrink-0 overflow-hidden rounded-lg sm:block"><Poster path={tmdb.poster_path} alt={`${title} poster`} className="size-full object-cover" sizes="112px" /></div><dl className="grid flex-1 content-start grid-cols-[90px_1fr] gap-x-4 gap-y-5 text-sm"><dt className="text-muted-foreground">Released</dt><dd>{year || 'Not available'}</dd><dt className="text-muted-foreground">Genres</dt><dd>{tmdb.genres?.map((genre) => genre.name).join(', ') || 'Not listed'}</dd><dt className="text-muted-foreground">Runtime</dt><dd>{runtime ? `${runtime} minutes` : 'Not listed'}</dd><dt className="text-muted-foreground">Metadata</dt><dd>{source === 'catalog' ? 'Curated catalogue' : 'The Movie Database'}</dd></dl></div></section>}
          {Object.values(ratings).some(Boolean) && <section aria-labelledby="ratings-heading" className="mt-8 border-t border-border pt-6"><h2 id="ratings-heading" className="mb-4 text-sm font-medium">A second opinion</h2><RatingBadges ratings={ratings} /></section>}
          <a href={`https://www.themoviedb.org/${mediaType}/${id}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground hover:text-foreground">View on TMDB<ArrowUpRight className="size-3.5" /></a>
        </div>

        <aside id="your-watchlist" className="scroll-mt-8 border-t border-border pt-7 lg:border-t-0 lg:border-l lg:pl-7 lg:pt-0">
          <h2 className="text-base font-medium">Make it yours</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">A place in your list. A mood for later.</p>
          {!canEdit ? <>
            {item && <div className="mt-6 flex flex-wrap items-center gap-3 text-sm"><StatusBadge status={item.status} />{item.moods.length > 0 && <span className="text-xs text-muted-foreground">{item.moods.join(' · ')}</span>}</div>}
            <LoginNotice className="mt-6" />
          </> : item ? <>
            <label htmlFor="watch-status" className="mt-6 mb-2 block text-xs font-medium text-muted-foreground">Watch status</label><select id="watch-status" className="field w-full" value={item.status} disabled={saving} onChange={(event) => updateItem({ status: event.target.value as WatchStatus })}>{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <fieldset disabled={saving} className="mt-7"><legend className="mb-3 text-xs font-medium text-muted-foreground">How does it feel?</legend><div className="flex flex-wrap gap-2">{MOODS.map((mood) => <button key={mood} type="button" aria-pressed={item.moods.includes(mood)} onClick={() => updateItem({ moods: item.moods.includes(mood) ? item.moods.filter((entry) => entry !== mood) : [...item.moods, mood] })} className={`min-h-11 rounded-lg border px-3 text-xs transition-colors disabled:opacity-50 ${item.moods.includes(mood) ? 'border-primary/35 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-white/25 hover:text-foreground'}`}>{mood}</button>)}</div></fieldset>
            <p role="status" className="mt-4 min-h-5 text-xs text-muted-foreground">{saving ? 'Saving your changes…' : 'Changes save automatically.'}</p>
            <Button variant="ghost" className="mt-5 -ml-3 text-muted-foreground" disabled={saving} onClick={() => { setError(''); setRemoveOpen(true) }}><Trash2 />Remove from watchlist</Button>
          </> : <Button className="mt-6 w-full" onClick={addToWatchlist} disabled={saving}><Plus />{saving ? 'Adding…' : 'Add to watchlist'}</Button>}
        </aside>
      </div>

      <Dialog open={removeOpen} onOpenChange={(open) => { if (!mutationLock.current) setRemoveOpen(open) }}>
        <DialogContent showCloseButton={false} className="p-6"><DialogTitle className="text-lg">Remove {title}?</DialogTitle><DialogDescription className="leading-6">This removes the title and its saved episode progress from your watchlist. You can add it again later.</DialogDescription>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="mt-2 flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => { setRemoveOpen(false); setError('') }}>Keep it</Button><Button variant="destructive" disabled={saving} onClick={() => item && void mutate(async () => { await api<void>(`/api/media/watchlist/${item.id}`, { method: 'DELETE' }); setItem(null); setProgress([]); setRemoveOpen(false) })}>{saving ? 'Removing…' : 'Remove title'}</Button></div></DialogContent>
      </Dialog>
    </div>
  )
}
