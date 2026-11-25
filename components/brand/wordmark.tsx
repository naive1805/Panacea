import Link from 'next/link'

import { cn } from '@/lib/utils'

type WordmarkProps = {
  href?: string
  className?: string
  size?: 'sm' | 'md'
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
    >
      <rect
        x="1"
        y="1"
        width="18"
        height="18"
        rx="4.5"
        className="fill-primary"
      />
      <rect
        x="6"
        y="8.6"
        width="8"
        height="2.8"
        rx="1.4"
        className="fill-primary-foreground"
      />
    </svg>
  )
}

export function Wordmark({ href = '/', className, size = 'md' }: WordmarkProps) {
  return (
    <Link
      href={href}
      aria-label="Panacea home"
      className={cn(
        'inline-flex items-center gap-2.5 rounded-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        className,
      )}
    >
      <BrandMark className={size === 'sm' ? 'size-4' : 'size-5'} />
      <span
        className={cn(
          'font-semibold tracking-[0.22em]',
          size === 'sm' ? 'text-xs' : 'text-sm',
        )}
      >
        PANACEA
      </span>
    </Link>
  )
}
