'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Plus, Search, Sparkles, X } from 'lucide-react'
import { api, type LibraryHealth } from '@/lib/media-client'
import { Button } from '@/components/media/ui/button'
import { Input } from '@/components/media/ui/input'
import Poster from '@/components/media/Poster'
import { cn } from '@/components/media/cn'
import type { MediaType, TmdbSearchResult, WatchlistItem } from '@/media/types'

export default function DiscoverPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | MediaType>('all')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [libraryReady, setLibraryReady] = useState(false)
  const [health, setHealth] = useState<LibraryHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const saveLock = useRef(false)
  const canEdit = health?.can_edit === true

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api<WatchlistItem[]>('/api/media/watchlist', { signal: controller.signal }), api<LibraryHealth>('/api/media/health', { signal: controller.signal })])
      .then(([items, health]) => { setSaved(new Set(items.map(item => `${item.media_type}-${item.tmdb_id}`))); setHealth(health); setLibraryReady(true) })
      .catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      api<TmdbSearchResult[]>(`/api/media/titles?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then(items => { setResults(items); setLoading(false) })
        .catch(error => { if (!controller.signal.aborted) { setError(error.message); setLoading(false) } })
    }, query ? 300 : 0)
    return () => { clearTimeout(timeout); controller.abort() }
  }, [query, attempt])

  async function save(item: TmdbSearchResult) {
    if (saveLock.current) return
    saveLock.current = true
    const key = `${item.media_type}-${item.id}`
    setPending(key); setError(''); setMessage('')
    try {
      await api('/api/media/watchlist', { method: 'POST', body: JSON.stringify({ tmdb_id: item.id, media_type: item.media_type, title: item.title, poster_path: item.poster_path }) })
      setSaved(previous => new Set(previous).add(key)); setMessage(`${item.title} added to your watchlist.`)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save this title.') }
    finally { saveLock.current = false; setPending(null) }
  }
  const visible = results.filter(item => type === 'all' || item.media_type === type)

  return (
    <div className="space-y-7">
      <div><h1 className="page-heading">There’s a whole world to watch.</h1><p className="muted mt-2">Find a new favorite. Save it for the right moment.</p></div>
      <div className="relative max-w-3xl"><Search className="pointer-events-none absolute top-4 left-4 size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" /><Input aria-label="Search titles" placeholder="Search for a film or series…" value={query} maxLength={300} onChange={event => { setQuery(event.target.value); setLoading(true); setError('') }} className="h-14! bg-card! pl-12! pr-12! text-base!" autoFocus />{query && <Button variant="ghost" size="icon" className="absolute top-1.5 right-1.5" aria-label="Clear search" onClick={() => { setQuery(''); setLoading(true); setError('') }}><X /></Button>}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><div role="group" aria-label="Discover media type" className="flex gap-2">{([{ value: 'all', label: 'All titles' }, { value: 'movie', label: 'Films' }, { value: 'tv', label: 'Series' }] as const).map(tab => <Button static key={tab.value} variant={type === tab.value ? 'secondary' : 'ghost'} size="sm" onClick={() => setType(tab.value)} aria-pressed={type === tab.value}>{tab.label}</Button>)}</div><span className="text-xs text-muted-foreground">{health?.catalog === 'live' ? 'Live search · powered by TMDB' : 'Exploring the sample catalogue'}</span></div>
      {error && <div role="alert" className="error-message flex flex-wrap items-center justify-between gap-3"><span>{error}</span><Button variant="outline" size="sm" onClick={() => { setError(''); setLoading(true); setAttempt(attempt + 1) }}>Try again</Button></div>}
      {health && !canEdit ? <p role="status" className="h-5 truncate text-sm leading-5 text-muted-foreground">Log in to edit your library. <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-primary">Log in</Link></p> : <p role="status" title={message} className="h-5 truncate text-sm leading-5 text-primary">{message}</p>}
      <section aria-labelledby="discover-heading" aria-busy={loading}>
        <div className="mb-5 flex items-center gap-3"><h2 id="discover-heading" className="section-heading">{query.trim() ? `Results for “${query.trim()}”` : 'Worth a place in your collection'}</h2>{!loading && <span className="text-xs text-muted-foreground tabular-nums">{visible.length} {visible.length === 1 ? 'title' : 'titles'}</span>}</div>
        {loading ? <div className="poster-grid" aria-label="Searching titles">{Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-muted" />)}</div> : visible.length ? <div className="poster-grid">{visible.map(item => {
          const key = `${item.media_type}-${item.id}`
          const isSaved = saved.has(key)
          return <article key={key} className="min-w-0">
            <Link href={`/item/${item.id}?type=${item.media_type}`} className="group block rounded-lg"><div className="image-outline aspect-[2/3] overflow-hidden rounded-lg"><Poster path={item.poster_path} alt={item.title} /></div><h3 title={item.title} className="mt-3 h-10 line-clamp-2 text-sm leading-5 font-medium [overflow-wrap:anywhere] transition-colors duration-150 group-hover:text-primary">{item.title}</h3><p className="mt-1 h-4 truncate text-xs leading-4 text-muted-foreground">{(item.release_date || item.first_air_date || '').slice(0, 4)} · {item.media_type === 'tv' ? 'Series' : 'Film'}</p></Link>
            {(canEdit || isSaved) && <Button variant={isSaved ? 'ghost' : 'outline'} size="sm" className={cn('mt-3 w-full', isSaved && 'text-primary!')} disabled={!libraryReady || isSaved || pending !== null} onClick={() => save(item)} aria-label={isSaved ? `${item.title} is in your library` : `Add ${item.title} to watchlist`}>
              <span className="relative size-4" aria-hidden="true"><Check className={cn('absolute inset-0 transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]', isSaved ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]')} /><Plus className={cn('absolute inset-0 transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]', isSaved ? 'scale-[0.25] opacity-0 blur-[4px]' : 'scale-100 opacity-100 blur-0')} /></span>
              {pending === key ? 'Saving…' : isSaved ? 'In your library' : 'Want to watch'}
            </Button>}
          </article>
        })}</div> : <div className="py-20 text-center"><Search className="mx-auto mb-4 text-muted-foreground" size={28} /><h3 className="text-lg">No titles found.</h3><p className="muted mt-2">{health?.catalog === 'live' ? 'Try another title or a shorter search.' : 'Try “Dune”, “Severance”, or “Past Lives” in the sample catalogue.'}</p></div>}
      </section>
      <Link href="/mood" className="flex items-center gap-3 border-t border-border pt-6 text-sm text-muted-foreground hover:text-foreground"><Sparkles className="text-primary" size={18} aria-hidden="true" />Can’t decide? Let your mood choose.<ArrowUpRight size={16} className="ml-auto" aria-hidden="true" /></Link>
    </div>
  )
}
