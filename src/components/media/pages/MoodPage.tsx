'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, Heart, Laugh, Lightbulb, Moon, Shuffle, Smile, Sparkles, Sunrise, Waves, Zap } from 'lucide-react'
import { api, type LibraryHealth } from '@/lib/media-client'
import { Button, buttonVariants } from '@/components/media/ui/button'
import { Input } from '@/components/media/ui/input'
import Poster from '@/components/media/Poster'
import WatchlistCard from '@/components/media/WatchlistCard'
import { cn } from '@/components/media/cn'
import { MOODS, type Mood, type WatchlistItem } from '@/media/types'

const icons = [Smile, Zap, Heart, Moon, Laugh, Lightbulb, Compass, Waves, Moon, Sunrise]
interface Picks { mood: string; recommendations: WatchlistItem[]; source: 'local' | 'ai'; fallback?: boolean; message?: string }

export default function MoodPage() {
  const [selected, setSelected] = useState<Mood | ''>('')
  const [custom, setCustom] = useState('')
  const [result, setResult] = useState<Picks | null>(null)
  const [health, setHealth] = useState<LibraryHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const activeMood = custom.trim() || selected

  useEffect(() => {
    const controller = new AbortController()
    api<LibraryHealth>('/api/media/health', { signal: controller.signal }).then(setHealth).catch(() => {})
    return () => { controller.abort(); request.current?.abort() }
  }, [])

  async function choose(mood = activeMood) {
    if (!mood || loading) return
    request.current?.abort()
    const controller = new AbortController(); request.current = controller
    setLoading(true); setError('')
    try { setResult(await api<Picks>('/api/media/mood', { method: 'POST', body: JSON.stringify({ mood, count: 4 }), signal: controller.signal })) }
    catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not find a pick.') }
    finally { if (!controller.signal.aborted) setLoading(false) }
  }

  const first = result?.recommendations[0]
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="pt-4 text-center"><div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles size={26} strokeWidth={1.5} aria-hidden="true" /></div><h1 className="text-[34px] leading-tight font-semibold tracking-[-0.045em] sm:text-[44px]">What are you in the mood for?</h1><p className="muted mx-auto mt-3 max-w-md">Something that stays with you. Or something that lets you switch off. There’s a watch for that.</p></div>
      <form onSubmit={event => { event.preventDefault(); choose() }} className="mx-auto max-w-2xl space-y-6">
        <fieldset disabled={loading}><legend className="sr-only">Choose your mood</legend><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">{MOODS.map((mood, index) => { const Icon = icons[index]; return <button type="button" key={mood} aria-pressed={selected === mood} onClick={() => { setSelected(selected === mood ? '' : mood); setCustom('') }} className={cn('flex min-h-24 flex-col items-center justify-center gap-3 rounded-xl border px-2 text-xs transition-[background-color,border-color,color] duration-150', selected === mood ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card/40 text-muted-foreground hover:border-white/25 hover:text-foreground')}><Icon size={21} strokeWidth={1.5} aria-hidden="true" />{mood}</button> })}</div></fieldset>
        <div><label htmlFor="custom-mood" className="mb-2 block text-xs text-muted-foreground">Or set the scene in your own words</label><Input id="custom-mood" value={custom} maxLength={500} disabled={loading} placeholder="A rainy evening, a slow story, nothing too heavy…" onChange={event => { setCustom(event.target.value); setSelected('') }} className="h-12! bg-card/40!" /></div>
        <div className="flex flex-wrap justify-center gap-3"><Button type="submit" size="lg" disabled={!activeMood || loading}><Sparkles aria-hidden="true" />{loading ? 'Finding your watch…' : 'Find my next watch'}<ArrowRight className="ml-2" aria-hidden="true" /></Button><Button type="button" variant="ghost" disabled={loading} onClick={() => { const mood = MOODS[Math.floor(Math.random() * MOODS.length)]; setSelected(mood); setCustom(''); choose(mood) }}><Shuffle aria-hidden="true" />Surprise me</Button></div>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">{health?.recommendation === 'ai' ? 'Picks from your unwatched library, with a little help from AI.' : 'Matched to the mood tags in your unwatched library.'}</p>
      </form>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div role="status" className="sr-only">{loading ? 'Finding recommendations' : result ? `${result.recommendations.length} recommendations found for ${result.mood}` : ''}</div>
      {result && !loading && <section className="border-t border-border pt-8" aria-label="Your mood recommendations"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="section-heading">{first ? result.fallback ? 'A few from your saved list.' : `Your “${result.mood}” kind of watch.` : 'Let’s give your mood more to work with.'}</h2><span className="text-xs text-muted-foreground">{result.source === 'ai' ? 'AI-assisted pick' : result.fallback ? 'From your saved list' : 'From your mood tags'}</span></div>
        {first ? <><Link href={`/item/${first.tmdb_id}?type=${first.media_type}`} className="image-outline relative isolate flex min-h-72 overflow-hidden rounded-xl"><div className="absolute inset-0 -z-10"><Poster path={first.metadata?.backdrop_path || first.poster_path} backdrop alt="" /></div><div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/95 via-black/75 to-black/5" /><div className="flex max-w-xl flex-col justify-center p-6 sm:p-8"><p className="eyebrow text-primary">The one for tonight</p><h3 className="mt-3 text-3xl font-semibold tracking-tight">{first.title}</h3><p className="mt-4 text-sm leading-relaxed text-white/75">{first.reason || `Saved by you. A match for your ${result.mood.toLowerCase()} mood.`}</p><span className="mt-6 flex items-center gap-2 text-sm">Take a closer look<ArrowRight size={17} /></span></div></Link>{result.recommendations.length > 1 && <div className="mt-7"><h3 className="mb-4 text-sm text-muted-foreground">{result.fallback ? 'More from your library' : 'A few more for the same feeling'}</h3><div className="grid max-w-2xl grid-cols-2 gap-5 sm:grid-cols-3">{result.recommendations.slice(1).map(item => <WatchlistCard key={item.id} item={item} />)}</div></div>}</> : <div className="py-10 text-center"><p className="muted mx-auto mb-5 max-w-md">{result.message || 'Add a few unwatched titles and give them mood tags. Your next pick starts there.'}</p><Link href="/search" className={buttonVariants({ variant: 'outline' })}>Discover a title<ArrowRight /></Link></div>}
        {first && result.message && <p className="muted mt-4">{result.message}</p>}
      </section>}
    </div>
  )
}
