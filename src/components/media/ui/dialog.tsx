'use client'

import * as React from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/components/media/cn'
import { Button } from '@/components/media/ui/button'

// Native <dialog> in place of Base UI: showModal()/close() driven by `open`,
// Escape (the `cancel` event) and backdrop clicks both ask the owner to close.
type DialogContextValue = { open: boolean; onOpenChange: (open: boolean) => void }
const DialogContext = React.createContext<DialogContextValue>({ open: false, onOpenChange: () => {} })

export function Dialog({ open = false, onOpenChange = () => {}, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}

export function DialogContent({ className, children, showCloseButton = true, ...props }: React.ComponentProps<'dialog'> & { showCloseButton?: boolean }) {
  const { open, onOpenChange } = React.useContext(DialogContext)
  const ref = React.useRef<HTMLDialogElement>(null)

  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      data-slot="dialog-content"
      onCancel={(event) => { event.preventDefault(); onOpenChange(false) }}
      onClick={(event) => { if (event.target === event.currentTarget) onOpenChange(false) }}
      className={cn(
        'fixed top-1/2 left-1/2 z-50 m-0 max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none open:grid sm:max-w-sm backdrop:bg-black/10 backdrop:backdrop-blur-xs',
        className,
      )}
      {...props}
    >
      {open && children}
      {open && showCloseButton && (
        <Button variant="ghost" size="icon-sm" className="absolute top-2 right-2" data-slot="dialog-close" onClick={() => onOpenChange(false)}>
          <XIcon />
          <span className="sr-only">Close</span>
        </Button>
      )}
    </dialog>
  )
}

export function DialogClose({ onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { onOpenChange } = React.useContext(DialogContext)
  return <Button data-slot="dialog-close" onClick={(event) => { onClick?.(event); onOpenChange(false) }} {...props} />
}

export function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 data-slot="dialog-title" className={cn('font-heading text-base leading-none font-medium', className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="dialog-description" className={cn('text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground', className)} {...props} />
}
