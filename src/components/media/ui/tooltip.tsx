'use client'

import * as React from 'react'
import { cn } from '@/components/media/cn'

// Minimal CSS-driven tooltip: the trigger carries `title` for assistive tech,
// and a visual bubble appears on hover or focus-within. No positioning engine.
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Tooltip({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="tooltip" className={cn('group/tooltip relative inline-flex', className)} {...props} />
}

export function TooltipTrigger({ ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="tooltip-trigger" tabIndex={0} {...props} />
}

export function TooltipContent({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      role="tooltip"
      data-slot="tooltip-content"
      className={cn(
        'pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 inline-flex w-max max-w-xs -translate-x-1/2 items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
        className,
      )}
      {...props}
    />
  )
}
