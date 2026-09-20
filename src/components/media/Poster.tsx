'use client'

import { useState } from 'react'
import { Film } from 'lucide-react'
import { cn } from '@/components/media/cn'

// Plain <img> with a TMDB srcSet: next.config has no remotePatterns for
// image.tmdb.org, so next/image would refuse these URLs at runtime.
const TMDB = 'https://image.tmdb.org/t/p/'

export default function Poster({ path, alt = '', backdrop = false, className, priority = false, sizes }: {
  path: string | null
  alt?: string
  backdrop?: boolean
  className?: string
  priority?: boolean
  sizes?: string
}) {
  const [failedPath, setFailedPath] = useState<string | null>(null)
  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-muted', className)}>
      {path && failedPath !== path ? (
        <img
          src={`${TMDB}${backdrop ? 'w1280' : 'w500'}${path}`}
          srcSet={backdrop ? `${TMDB}w780${path} 780w, ${TMDB}w1280${path} 1280w` : `${TMDB}w342${path} 342w, ${TMDB}w500${path} 500w`}
          sizes={sizes || (backdrop ? '(max-width: 768px) 100vw, 80vw' : '(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 16vw')}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedPath(path)}
        />
      ) : (
        <div className="flex h-full min-h-12 flex-col items-center justify-center gap-3 p-4 text-muted-foreground">
          <Film size={28} strokeWidth={1.5} aria-hidden="true" />
          {alt && <span className="text-center text-xs">{alt}</span>}
        </div>
      )}
    </div>
  )
}
