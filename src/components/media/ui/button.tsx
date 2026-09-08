'use client'

import * as React from 'react'
import { cn } from '@/components/media/cn'

const base = 'inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-[scale,background-color,color,box-shadow] duration-150 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4'

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_1px_2px_#0003,inset_0_1px_0_#ffffff25]',
  outline: 'border-border bg-transparent hover:bg-white/5',
  secondary: 'bg-foreground text-background hover:bg-foreground/90',
  ghost: 'hover:bg-muted hover:text-foreground text-muted-foreground',
  destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  link: 'text-primary underline-offset-4 hover:underline',
}

const sizes = {
  default: 'h-11 gap-2 px-4',
  sm: 'h-10 gap-1.5 px-3 text-xs',
  lg: 'h-12 gap-2 px-6',
  icon: 'size-11',
  'icon-sm': 'size-10',
}

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

export function buttonVariants({ variant = 'default', size = 'default', className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className)
}

export function Button({ className, variant = 'default', size = 'default', static: isStatic = false, type = 'button', ...props }: React.ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize; static?: boolean }) {
  return <button type={type} data-slot="button" className={cn(buttonVariants({ variant, size }), !isStatic && 'motion-safe:active:not-disabled:scale-[0.96]', className)} {...props} />
}
