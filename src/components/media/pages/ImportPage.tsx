'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, CircleAlert, FileJson, FolderInput, LogIn, Upload, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/media/ui/button'
import Poster from '@/components/media/Poster'
import { api, type LibraryHealth } from '@/lib/media-client'
import type { TmdbSearchResult } from '@/media/types'

type Match = { title: string; match: TmdbSearchResult }
type Preview = { matched: Match[]; unmatched: string[]; failed?: string[]; notice?: string; source?: string }
type Stage = 'upload' | 'preview' | 'done'
const STEPS: { stage: Stage; label: string }[] = [{ stage: 'upload', label: 'Bring your list' }, { stage: 'preview', label: 'Review matches' }, { stage: 'done', label: 'Make yourself at home' }]
const isExactMatch = ({ title, match }: Match) => title.trim().toLocaleLowerCase() === match.title.trim().toLocaleLowerCase()

export default function ImportPage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const stageHeading = useRef<HTMLHeadingElement>(null)
  const errorAlert = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const [health, setHealth] = useState<LibraryHealth | null>(null)
  const [stage, setStage] = useState<Stage>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Preview>({ matched: [], unmatched: [] })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [result, setResult] = useState({ imported: 0, skipped: 0 })
  const [dragging, setDragging] = useState(false)
  const [filename, setFilename] = useState('')
  const [pasted, setPasted] = useState('')
  const currentStep = STEPS.findIndex((step) => step.stage === stage)
  const canEdit = health?.can_edit === true

  useEffect(() => {
    const controller = new AbortController()
    api<LibraryHealth>('/api/media/health', { signal: controller.signal }).then(setHealth).catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => { if (stage !== 'upload') stageHeading.current?.focus() }, [stage])
  useEffect(() => { if (error) errorAlert.current?.focus() }, [error])

  async function matchFile(file?: File) {
    if (busy.current) return
    busy.current = true
    setLoading(true)
    setError('')
    try {
      if (file && (!file.name.toLowerCase().endsWith('.json') || file.size > 1_000_000)) throw new Error('Choose a JSON file under 1 MB. Extract your Takeout ZIP first.')
      const raw = file ? await file.text() : pasted.trim()
      if (!raw) throw new Error('Choose a JSON file or paste its contents to get started.')
      if (new Blob([raw]).size > 1_000_000) throw new Error('Keep each import under 1 MB.')
      setFilename(file?.name ?? 'Pasted JSON')
      const data = await api<Preview>('/api/media/import', { method: 'POST', body: JSON.stringify({ raw }) })
      setPreview(data)
      setSelected(new Set(data.matched.flatMap((entry, index) => isExactMatch(entry) ? [index] : [])))
      setStage('preview')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We couldn’t read that file. Please try again.')
    } finally {
      busy.current = false
      setLoading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function confirmImport() {
    if (busy.current || !selected.size) return
    busy.current = true
    setLoading(true)
    setError('')
    try {
      const items = preview.matched.filter((_, index) => selected.has(index)).map(({ match }) => ({ tmdb_id: match.id, media_type: match.media_type, title: match.title, poster_path: match.poster_path }))
      const data = await api<{ imported: number; skipped?: number }>('/api/media/import', { method: 'PUT', body: JSON.stringify({ items }) })
      setResult({ imported: data.imported, skipped: data.skipped ?? 0 })
      setStage('done')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your import couldn’t be saved. Your selection is still here; try again.')
    } finally {
      busy.current = false
      setLoading(false)
    }
  }

  function toggle(index: number) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function startOver() {
    setStage('upload')
    setError('')
    setPasted('')
    setFilename('')
  }

  return (
    <div className="mx-auto max-w-[1040px] pb-10">
      <header className="pt-2"><p className="eyebrow">Less starting over. More watching.</p><h1 className="page-heading mt-3">Good taste travels.</h1><p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground sm:text-[15px]">Bring the movies and shows you’ve saved on Google into your library. Your next great watch might already be on the list.</p></header>

      <ol aria-label="Import progress" className="mt-10 grid grid-cols-3 gap-3 border-b border-border pb-7 sm:gap-6">
        {STEPS.map((step, index) => <li key={step.stage} aria-current={stage === step.stage ? 'step' : undefined} className={`flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:text-sm ${index <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}><span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums ${index < currentStep ? 'border-primary/30 bg-primary/10 text-primary' : index === currentStep ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{index < currentStep ? <Check className="size-3.5" /> : `0${index + 1}`}</span><span className="leading-5">{step.label}</span></li>)}
      </ol>

      {error && <div ref={errorAlert} tabIndex={-1} role="alert" className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6"><CircleAlert className="mt-0.5 size-5 shrink-0 text-primary" /><p>{error}</p></div>}

      {stage === 'upload' && <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_270px] lg:gap-12">
        <section aria-labelledby="upload-heading">
          {health && !canEdit ? <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/18 bg-white/2 px-6 py-10 text-center">
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-white/5 text-primary"><LogIn className="size-7" strokeWidth={1.5} /></div>
            <h2 id="upload-heading" className="text-lg font-medium">Log in to edit your library.</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Importing adds titles to this library, so it needs an editor account.</p>
            <Link href="/login" className={buttonVariants({ className: 'mt-6' })}><LogIn />Log in</Link>
          </div> : <>
          <div onDragOver={(event) => { event.preventDefault(); if (!busy.current) setDragging(true) }} onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false) }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (busy.current) return; const file = event.dataTransfer.files[0]; if (event.dataTransfer.files.length > 1) setError('Upload one JSON file at a time.'); else if (file) void matchFile(file) }} className={`flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${dragging ? 'border-primary bg-primary/8' : 'border-white/18 bg-white/2'}`}>
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-white/5 text-primary"><FolderInput className="size-7" strokeWidth={1.5} /></div>
            <h2 id="upload-heading" className="text-lg font-medium">{loading ? 'Finding your movies & shows…' : dragging ? 'Drop it here.' : 'A fresh start for your saved list.'}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{loading ? `Matching titles from ${filename || 'your file'}. A bigger collection can take a moment.` : 'Drop your Google Takeout JSON file here, or choose one from your device.'}</p>
            {loading ? <div role="status" className="mt-6 w-48"><progress aria-label="Matching titles" className="h-1.5 w-full accent-primary" /><span className="sr-only">Matching your titles. Please wait.</span></div> : <Button className="mt-6" disabled={!canEdit} onClick={() => fileInput.current?.click()}><Upload />Choose JSON file</Button>}
            <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Google Takeout JSON file" className="hidden" disabled={loading || !canEdit} onChange={(event) => { const file = event.target.files?.[0]; if (file) void matchFile(file) }} />
            <p className="mt-4 text-xs text-muted-foreground">JSON · under 1 MB · up to 100 titles</p>
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">Your file is sent to your library server to match its titles. You’ll review the results before anything is added.</p>
          <details className="mt-6 border-t border-border pt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm text-muted-foreground hover:text-foreground">Or paste the JSON</summary><label htmlFor="import-json" className="sr-only">Google Takeout JSON contents</label><textarea id="import-json" value={pasted} onChange={(event) => setPasted(event.target.value)} disabled={loading || !canEdit} placeholder={'[{"title": "Inception"}, {"title": "Severance"}]'} className="field mt-3 min-h-36 w-full resize-y p-3 font-mono text-xs leading-6" /><Button variant="outline" className="mt-3" disabled={loading || !canEdit || !pasted.trim()} onClick={() => void matchFile()}><FileJson />Review this list</Button></details>
          </>}
        </section>
        <aside className="lg:pt-3"><p className="eyebrow">From Google to your couch</p><h2 className="mt-3 text-lg font-medium tracking-tight">Find your export.</h2><ol className="mt-6 space-y-6 text-sm"><li className="flex gap-3"><span className="text-primary tabular-nums">01</span><p className="leading-6 text-muted-foreground">Open <a href="https://takeout.google.com/" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4 hover:text-primary">Google Takeout</a> and deselect all products.</p></li><li className="flex gap-3"><span className="text-primary tabular-nums">02</span><p className="leading-6 text-muted-foreground">Select <strong className="font-medium text-foreground">Saved</strong>, then create and download your export.</p></li><li className="flex gap-3"><span className="text-primary tabular-nums">03</span><p className="leading-6 text-muted-foreground">Extract the ZIP and find the JSON file for your movie or TV collection.</p></li></ol><div className="mt-8 border-t border-border pt-5"><p className="text-sm font-medium">Your progress stays yours.</p><p className="mt-2 text-xs leading-6 text-muted-foreground">Titles already in your watchlist keep their status, mood tags, and episode progress.</p></div></aside>
      </div>}

      {stage === 'preview' && <section className="mt-9" aria-labelledby="preview-heading">
        <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="eyebrow">The guest list</p><h2 id="preview-heading" ref={stageHeading} tabIndex={-1} className="mt-2 text-2xl font-medium tracking-tight outline-none">Let’s make sure these are right.</h2><p className="mt-3 text-sm text-muted-foreground tabular-nums">{preview.matched.length} {preview.matched.length === 1 ? 'match' : 'matches'} · {preview.unmatched.length} not found{preview.failed?.length ? ` · ${preview.failed.length} couldn’t be checked` : ''}</p></div><Button variant="outline" disabled={loading} onClick={() => { setStage('upload'); setError('') }}>Choose another file</Button></div>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">Check the title, year, and format before importing. Different title matches start unselected so you can decide whether they’re the ones you meant.</p>
        {preview.notice && <p className="mt-3 text-sm leading-6 text-muted-foreground">{preview.notice}</p>}
        {preview.matched.length > 0 ? <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><span className="text-xs text-muted-foreground tabular-nums">{selected.size} of {preview.matched.length} selected</span><Button variant="ghost" disabled={loading} onClick={() => setSelected(selected.size === preview.matched.length ? new Set() : new Set(preview.matched.map((_, index) => index)))}>{selected.size === preview.matched.length ? 'Clear selection' : 'Select all matches'}</Button></div>
          <fieldset disabled={loading} className="divide-y divide-border"><legend className="sr-only">Titles to import</legend>{preview.matched.map((entry, index) => {
            const { title, match } = entry
            const year = (match.release_date ?? match.first_air_date ?? '').slice(0, 4)
            return <label key={`${title}-${match.media_type}-${match.id}-${index}`} className={`flex cursor-pointer items-center gap-4 rounded-lg px-2 py-4 transition-colors hover:bg-white/3 sm:gap-5 sm:px-3 ${loading ? 'pointer-events-none opacity-60' : ''}`}><input type="checkbox" checked={selected.has(index)} onChange={() => toggle(index)} className="size-[18px] shrink-0 accent-primary" /><span className="relative block h-[72px] w-12 shrink-0 overflow-hidden rounded-md"><Poster path={match.poster_path} alt="" className="size-full object-cover" sizes="48px" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{match.title}</span><span className="mt-1.5 block text-xs text-muted-foreground">{match.media_type === 'tv' ? 'TV series' : 'Movie'}{year ? ` · ${year}` : ' · Year unavailable'}</span>{!isExactMatch(entry) && <span className="mt-2 block text-xs leading-5 text-[#e6b77c]">Check this match · saved as “{title}”</span>}</span>{selected.has(index) && <span className="hidden text-xs text-primary sm:block">Selected</span>}</label>
          })}</fieldset>
        </> : <div className="mt-7 rounded-xl border border-dashed border-border p-8"><h3 className="font-medium">No matches to import yet.</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Try another export, or find your titles through Discover.</p><Link href="/search" className={buttonVariants({ variant: 'outline', className: 'mt-5' })}>Discover titles<ArrowRight /></Link></div>}
        {(preview.unmatched.length > 0 || Boolean(preview.failed?.length)) && <div className="mt-8 grid gap-6 sm:grid-cols-2">{preview.unmatched.length > 0 && <div><h3 className="text-sm font-medium">Not found</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">These titles won’t be added. You can search for them later.</p><div className="mt-3 flex flex-wrap gap-2">{preview.unmatched.map((title, index) => <span key={`${title}-${index}`} className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-2 text-xs text-muted-foreground"><X className="size-3" />{title}</span>)}</div></div>}{Boolean(preview.failed?.length) && <div><h3 className="text-sm font-medium">Couldn’t be checked</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">The title service didn’t respond. Retry this file later for these titles.</p><p className="mt-3 text-sm text-muted-foreground">{preview.failed?.join(', ')}</p></div>}</div>}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-6"><p role="status" className="text-xs leading-6 text-muted-foreground">{loading ? 'Adding your selected titles…' : 'New titles are added to Want to watch.'}</p><Button onClick={() => void confirmImport()} disabled={loading || !selected.size}>{loading ? 'Importing…' : `Import ${selected.size} ${selected.size === 1 ? 'title' : 'titles'}`}<ArrowRight /></Button></div>
      </section>}

      {stage === 'done' && <section className="mx-auto max-w-lg py-16 text-center sm:py-24"><div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="size-7" /></div><p className="eyebrow">All settled in</p><h2 ref={stageHeading} tabIndex={-1} className="mt-3 text-3xl font-medium tracking-tight outline-none">{result.imported ? `${result.imported} more ${result.imported === 1 ? 'reason' : 'reasons'} to stay in.` : 'Your list is already up to date.'}</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">{result.imported ? `${result.imported} ${result.imported === 1 ? 'title is' : 'titles are'} now in your watchlist, ready whenever you are.` : 'Every selected title was already in your watchlist.'}{result.skipped > 0 ? ` ${result.skipped} existing ${result.skipped === 1 ? 'title was kept as it was' : 'titles were kept as they were'}.` : ''}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={startOver}>Import another list</Button><Link href="/" className={buttonVariants()}>Your watchlist<ArrowRight /></Link></div></section>}
    </div>
  )
}
