'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Asterisk, BookOpen, Compass, Sparkles, Upload, Search, Menu, X, ArrowUpRight, HardDrive, LogIn, LogOut } from 'lucide-react'
import { cn } from '@/components/media/cn'
import { api, type LibraryHealth } from '@/lib/media-client'
import { Button } from '@/components/media/ui/button'
import LibraryBackup from '@/components/media/LibraryBackup'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/media/ui/dialog'

const links = [
  { href: '/', label: 'My library', icon: BookOpen },
  { href: '/search', label: 'Discover', icon: Compass },
  { href: '/mood', label: 'Mood pick', icon: Sparkles },
]

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  window.location.assign('/')
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [health, setHealth] = useState<LibraryHealth | null>(null)
  const [clearing, setClearing] = useState(false)
  const [backupPending, setBackupPending] = useState(false)
  const [error, setError] = useState('')
  const canEdit = health?.can_edit === true
  useEffect(() => {
    const controller = new AbortController()
    api<LibraryHealth>('/api/media/health', { signal: controller.signal }).then(setHealth).catch(() => {})
    function searchShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); router.push('/search') }
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', searchShortcut)
    return () => { controller.abort(); window.removeEventListener('keydown', searchShortcut) }
  }, [router, pathname, infoOpen])

  async function clearSamples() {
    setClearing(true); setError('')
    try {
      await api('/api/media/library', { method: 'DELETE' })
      window.location.assign('/')
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not remove sample titles.'); setClearing(false) }
  }

  const navigation = [...links, { href: '/import', label: 'Import collection', icon: Upload }]
  const accountClass = 'flex h-10 items-center gap-3 rounded-lg px-2 text-xs text-muted-foreground transition-colors duration-150 hover:bg-white/4 hover:text-foreground'
  const account = health && (canEdit
    ? <button type="button" onClick={() => void logout()} className={accountClass}><LogOut size={16} strokeWidth={1.5} aria-hidden="true" />Log out</button>
    : <Link href="/login" className={accountClass}><LogIn size={16} strokeWidth={1.5} aria-hidden="true" />Log in</Link>)
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-[#151517] px-4 py-8 md:flex">
        <Link href="/" aria-label="Vistara home" className="flex items-center gap-3 px-2">
          <Asterisk size={38} strokeWidth={1.5} className="shrink-0 text-primary" aria-hidden="true" />
          <span><span className="text-[17px] font-medium tracking-[0.28em]">VISTARA</span><span className="mt-1 block text-[10px] tracking-normal text-muted-foreground">A little less scrolling.</span></span>
        </Link>
        <nav aria-label="Main navigation" className="mt-12 space-y-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={cn('flex h-12 items-center gap-3 rounded-lg px-4 text-[13px] transition-colors duration-150', pathname === href ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/4 hover:text-foreground')}><Icon size={19} strokeWidth={1.5} aria-hidden="true" />{label}</Link>
          ))}
          <div className="pt-7"><Link href="/import" aria-current={pathname === '/import' ? 'page' : undefined} className={cn('flex h-12 items-center gap-3 rounded-lg px-4 text-[13px] transition-colors duration-150', pathname === '/import' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/4 hover:text-foreground')}><Upload size={18} strokeWidth={1.5} aria-hidden="true" />Import collection</Link></div>
        </nav>
        <div className="mt-auto border-t border-border pt-5">
          {account}
          <button onClick={() => setInfoOpen(true)} className="flex min-h-16 w-full items-center gap-3 px-2 text-left">
            <span className={cn('size-2 shrink-0 rounded-full', health ? 'bg-emerald-400' : 'bg-zinc-500')} />
            <span className="flex-1 text-xs">Your library<span className="mt-1 block text-[10px] text-muted-foreground">{health ? 'Saved to your Arkivel' : 'Connecting to your library'}</span></span><ArrowUpRight size={15} className="text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      </aside>
      <header className="absolute top-0 right-0 left-0 z-30 flex h-[76px] items-center justify-between gap-3 px-5 md:left-56 md:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-[0.15em] md:hidden"><Asterisk className="text-primary" aria-hidden="true" />VISTARA</Link>
        <span className="hidden items-center gap-2.5 text-xs text-muted-foreground md:flex"><BookOpen size={15} strokeWidth={1.5} aria-hidden="true" />{pathname === '/' ? 'Your collection' : pathname === '/search' ? 'Find your next favorite' : pathname === '/mood' ? 'A watch for every mood' : pathname === '/import' ? 'Bring your collection' : 'In the details'}</span>
        <div className="flex items-center gap-3">
          <Link href="/search" className="flex h-10 items-center gap-2.5 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:border-white/20 hover:text-foreground"><Search size={16} strokeWidth={1.5} aria-hidden="true" /><span className="hidden sm:inline">Search movies & shows</span><kbd className="ml-6 hidden rounded bg-white/5 px-1.5 py-0.5 text-[10px] md:inline">⌘ K</kbd><span className="sr-only sm:hidden">Search movies and shows</span></Link>
          <button onClick={() => setInfoOpen(true)} aria-label="Library settings" className="hidden size-10 items-center justify-center rounded-full border border-border text-sm md:flex">V</button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button>
        </div>
      </header>
      {menuOpen && <nav aria-label="Mobile navigation" className="absolute top-[72px] right-4 left-4 z-40 rounded-xl border border-border bg-card p-2 shadow-xl md:hidden">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={pathname === href ? 'page' : undefined} className={cn('flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm', pathname === href ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}><Icon size={18} aria-hidden="true" />{label}</Link>)}<button onClick={() => { setMenuOpen(false); setInfoOpen(true) }} className="flex h-12 w-full items-center gap-3 px-4 text-sm text-muted-foreground"><HardDrive size={18} />Your library</button>{health && (canEdit ? <button type="button" onClick={() => void logout()} className="flex h-12 w-full items-center gap-3 px-4 text-sm text-muted-foreground"><LogOut size={18} aria-hidden="true" />Log out</button> : <Link href="/login" onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm text-muted-foreground"><LogIn size={18} aria-hidden="true" />Log in</Link>)}</nav>}
      <Dialog open={infoOpen} onOpenChange={(open) => { if (backupPending || clearing) return; setInfoOpen(open); setConfirmClear(false); setError('') }}>
        <DialogContent showCloseButton={!backupPending && !clearing} className="p-6 sm:max-w-md">
          <HardDrive className="mb-2 text-primary" size={28} aria-hidden="true" />
          <DialogTitle className="text-xl">Your library, on your Arkivel.</DialogTitle>
          <DialogDescription>Titles and episode progress are saved in this Arkivel&rsquo;s database, so they follow you across devices.</DialogDescription>
          <p className="muted">{health?.catalog === 'live' ? 'Live movie search is connected.' : 'You’re exploring a curated sample catalogue. Full catalogue search is available when a TMDB key is configured.'}</p>
          <LibraryBackup canEdit={canEdit} onPendingChange={setBackupPending} />
          {health?.sample_library && canEdit && <div className="mt-2 border-t border-border pt-4"><p className="muted mb-3">We included sample titles to help you explore. Titles you added or edited will stay when you remove them.</p><Button variant="destructive" className="w-full" disabled={clearing || backupPending} onClick={() => confirmClear ? clearSamples() : setConfirmClear(true)}>{clearing ? 'Removing…' : confirmClear ? 'Confirm: remove sample titles' : 'Remove sample titles'}</Button></div>}
          {error && <p role="alert" className="error-message">{error}</p>}
        </DialogContent>
      </Dialog>
    </>
  )
}
