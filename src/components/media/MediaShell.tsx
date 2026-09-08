import Nav from '@/components/media/Nav'
import { TooltipProvider } from '@/components/media/ui/tooltip'

// Vistara's layout body: fixed sidebar/header from Nav, then the main column.
export default function MediaShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Nav />
      <main id="main-content" className="mx-auto min-h-dvh max-w-[1840px] px-5 pt-24 pb-12 md:ml-56 md:px-8 lg:px-10">{children}</main>
    </TooltipProvider>
  )
}
