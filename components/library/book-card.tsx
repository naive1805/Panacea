import Link from 'next/link'
import type { CSSProperties } from 'react'

import { Badge } from '@/components/ui/badge'
import { FORM_LABELS, spineInk } from '@/lib/constants'
import { expiryMeta, formatClockTime } from '@/lib/doses'
import type { Medicine, Schedule } from '@/lib/types'
import { cn } from '@/lib/utils'

type BookCardProps = {
  medicine: Medicine
  schedules?: Schedule[]
  /** Days ahead to treat as "expiring soon" (from notification prefs). */
  expiryLeadDays?: number
  className?: string
}

/**
 * A medicine as a volume standing on the shelf: a warm cover, a coloured
 * spine, the name set in serif like a title, and the practical details
 * (strength, form, times, expiry) stamped below like a book's imprint.
 */
export function BookCard({
  medicine,
  schedules = [],
  expiryLeadDays,
  className,
}: BookCardProps) {
  const ink = spineInk(medicine.color)
  const expiry =
    expiryLeadDays === undefined
      ? expiryMeta(medicine.expiry_date)
      : expiryMeta(medicine.expiry_date, expiryLeadDays)
  const imprint = [medicine.strength, FORM_LABELS[medicine.form]]
    .filter(Boolean)
    .join(' · ')

  const times = schedules
    .filter((schedule) => schedule.active)
    .map((schedule) => formatClockTime(schedule.time))
  const archived = Boolean(medicine.archived_at)

  const status = archived ? 'archived' : expiry ? expiry.label : 'no expiry recorded'

  return (
    <Link
      href={`/dashboard/medicines/${medicine.id}`}
      aria-label={`${medicine.name} — ${status}`}
      className={cn(
        'group block h-[15rem] rounded-r-lg rounded-l-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        className,
      )}
    >
      <article
        className={cn(
          'book-cover relative flex h-full flex-col overflow-hidden rounded-r-lg rounded-l-sm border border-border-strong py-4 pr-4 pl-7 shadow-[0_1px_2px_rgba(0,0,0,0.07)] transition-all duration-200 group-hover:-translate-y-1.5 group-hover:shadow-raised',
          archived && 'opacity-70 saturate-50',
        )}
      >
        <span
          aria-hidden="true"
          className="book-spine absolute inset-y-0 left-0 w-4"
          style={{ '--spine': ink } as CSSProperties}
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-4 w-px bg-black/10"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-r-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
        />

        <div className="relative flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[0.65rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            {imprint || FORM_LABELS[medicine.form]}
          </p>
          <span aria-hidden="true" className="mt-2 block h-px w-9 bg-brass/70" />

          <h3 className="mt-3 line-clamp-3 font-serif text-xl leading-[1.12] font-normal tracking-tight text-balance text-foreground">
            {medicine.name}
          </h3>

          {medicine.instructions ? (
            <p className="mt-3 line-clamp-2 font-serif text-sm leading-relaxed text-muted-foreground italic">
              {medicine.instructions}
            </p>
          ) : null}

          <div className="mt-auto flex flex-col items-start gap-2 pt-4">
            {archived ? (
              <Badge variant="outline">Off the shelf</Badge>
            ) : expiry ? (
              <Badge
                variant={
                  expiry.tone === 'ok'
                    ? 'neutral'
                    : expiry.tone === 'warning'
                      ? 'warning'
                      : 'danger'
                }
                dot
              >
                {expiry.label}
              </Badge>
            ) : (
              <Badge variant="neutral">No expiry recorded</Badge>
            )}

            <span className="text-[0.7rem] text-muted-foreground tabular-nums">
              {times.length > 0
                ? `${times.length}× daily · ${times.slice(0, 2).join(', ')}${
                    times.length > 2 ? ` +${times.length - 2}` : ''
                  }`
                : 'As needed'}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
