'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Download, Upload } from 'lucide-react'
import { Button, buttonVariants } from '@/components/media/ui/button'
import { api } from '@/lib/media-client'

type Counts = { added: number; existing: number; episodesAdded: number; episodesExisting: number }

export default function LibraryBackup({ canEdit, onPendingChange }: { canEdit: boolean; onPendingChange: (pending: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const message = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const [backup, setBackup] = useState<unknown>(null)
  const [filename, setFilename] = useState('')
  const [counts, setCounts] = useState<Counts | null>(null)
  const [pending, setPending] = useState(false)
  const [restored, setRestored] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (counts || error) message.current?.focus() }, [counts, error])

  async function review(file: File) {
    if (busy.current) return
    busy.current = true; setPending(true); onPendingChange(true); setError(''); setCounts(null); setBackup(null); setRestored(false)
    try {
      if (!file.name.toLowerCase().endsWith('.json') || file.size > 10_000_000) throw new Error('Choose a Vistara JSON backup under 10 MB.')
      let source: unknown
      try { source = JSON.parse(await file.text()) } catch { throw new Error('This file is not valid JSON. Choose a downloaded Vistara backup.') }
      const result = await api<Counts>('/api/media/library', { method: 'POST', body: JSON.stringify({ backup: source }) })
      setBackup(source); setCounts(result); setFilename(file.name)
    } catch (cause) { setError(cause instanceof TypeError ? 'Could not connect to Vistara. Choose the backup again to retry.' : cause instanceof Error ? cause.message : 'Could not read this backup.') }
    finally { busy.current = false; setPending(false); onPendingChange(false); if (input.current) input.current.value = '' }
  }

  async function restore() {
    if (busy.current || !backup) return
    busy.current = true; setPending(true); onPendingChange(true); setError('')
    try {
      const result = await api<Counts>('/api/media/library', { method: 'PUT', body: JSON.stringify({ backup }) })
      setCounts(result); setRestored(true); setBackup(null)
    } catch (cause) { setError(cause instanceof TypeError ? 'Could not connect to Vistara. Your backup is still ready; try again.' : cause instanceof Error ? cause.message : 'Could not restore this backup. You can try again.') }
    finally { busy.current = false; setPending(false); onPendingChange(false) }
  }

  return <section aria-label="Move your library" className="space-y-3">
    <a href="/api/media/library" download className={`${buttonVariants({ variant: 'outline' })} w-full`}><Download strokeWidth={1.5} />Download library backup</a>
    {!canEdit && <p className="text-xs leading-5 text-muted-foreground">Log in to edit your library. <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-primary">Log in</Link></p>}
    {canEdit && !counts && <Button variant="outline" className="w-full" disabled={pending} onClick={() => input.current?.click()}><Upload strokeWidth={1.5} />{pending ? 'Checking backup…' : 'Restore a Vistara backup'}</Button>}
    <input ref={input} type="file" accept=".json,application/json" aria-label="Vistara library backup" className="hidden" disabled={pending || !canEdit} onChange={(event) => { const file = event.target.files?.[0]; if (file) void review(file) }} />
    {canEdit && !counts && <p className="text-xs leading-5 text-muted-foreground">Move titles, tags and episode progress between computers. Vistara JSON · under 10 MB.</p>}
    {(counts || error) && <div ref={message} tabIndex={-1} className="space-y-3 rounded-xl border border-border bg-background p-4">
      {error && <p role="alert" className="text-sm leading-6 text-destructive">{error}</p>}
      {counts && <>
        <h3 className="flex items-center gap-2 text-sm font-medium">{restored && <Check className="size-4 text-primary" />}{restored ? 'Your library came with you.' : 'Ready to bring it over?'}</h3>
        <p className="break-all text-xs text-muted-foreground">{filename}</p>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm tabular-nums">
          <dt className="text-muted-foreground">{restored ? 'Titles added' : 'New titles'}</dt><dd>{counts.added}</dd>
          <dt className="text-muted-foreground">Existing titles kept</dt><dd>{counts.existing}</dd>
          <dt className="text-muted-foreground">{restored ? 'Episode marks added' : 'New episode marks'}</dt><dd>{counts.episodesAdded}</dd>
          <dt className="text-muted-foreground">Episode marks already here</dt><dd>{counts.episodesExisting}</dd>
        </dl>
        <p className="text-xs leading-5 text-muted-foreground">{restored ? 'Your changes are saved to your Arkivel.' : 'New titles keep their saved status, tags and dates. For titles already here, your current details win and missing episode marks are added. Nothing is deleted. Counts are checked again when you restore.'}</p>
        {restored ? <Button className="w-full" onClick={() => window.location.assign('/')}>Open your library</Button> : <div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={() => void restore()}>{pending ? 'Restoring…' : 'Restore into my library'}</Button><Button variant="ghost" disabled={pending} onClick={() => { setCounts(null); setBackup(null); setError('') }}>Cancel</Button></div>}
      </>}
    </div>}
    {pending && <p role="status" className="sr-only">{backup ? 'Restoring your library' : 'Checking your backup'}</p>}
  </section>
}
