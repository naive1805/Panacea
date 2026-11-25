import { Badge } from '@/components/ui/badge'
import { formatDayLabel, formatDateTime } from '@/lib/doses'
import type { DoseLog, Medicine } from '@/lib/types'

const STATUS_META: Record<
  string,
  { label: string; variant: 'success' | 'accent' | 'neutral' | 'warning' | 'danger' }
> = {
  taken: { label: 'Taken', variant: 'success' },
  snoozed: { label: 'Snoozed', variant: 'accent' },
  skipped: { label: 'Skipped', variant: 'neutral' },
  missed: { label: 'Missed', variant: 'danger' },
}

type DoseHistoryProps = {
  logs: DoseLog[]
  medicines: Medicine[]
  /** Group rows under day headings (used on the full history page). */
  grouped?: boolean
  emptyMessage?: string
}

export function DoseHistory({
  logs,
  medicines,
  grouped = false,
  emptyMessage = 'Nothing recorded yet.',
}: DoseHistoryProps) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-strong bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  const medicineById = new Map(medicines.map((m) => [m.id, m]))

  if (!grouped) {
    return (
      <ul className="divide-y divide-border/70">
        {logs.map((log) => (
          <HistoryRow key={log.id} log={log} medicine={medicineById.get(log.medicine_id)} showDay />
        ))}
      </ul>
    )
  }

  const days: { key: string; label: string; logs: DoseLog[] }[] = []
  for (const log of logs) {
    const dayKey = log.scheduled_for.slice(0, 10)
    const bucket = days.find((d) => d.key === dayKey)
    if (bucket) {
      bucket.logs.push(log)
    } else {
      days.push({ key: dayKey, label: formatDayLabel(log.scheduled_for), logs: [log] })
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => (
        <section key={day.key} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2.5 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            <span aria-hidden="true" className="h-px w-5 bg-brass" />
            {day.label}
          </h2>
          <ul className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border/80 bg-card">
            {day.logs.map((log) => (
              <HistoryRow
                key={log.id}
                log={log}
                medicine={medicineById.get(log.medicine_id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function HistoryRow({
  log,
  medicine,
  showDay = false,
}: {
  log: DoseLog
  medicine?: Medicine
  showDay?: boolean
}) {
  const meta = STATUS_META[log.status] ?? STATUS_META.missed

  return (
    <li className="flex items-center gap-4 px-4 py-3.5">
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
        {showDay
          ? formatDateTime(log.scheduled_for)
          : new Date(log.scheduled_for).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-lg leading-snug font-normal text-foreground">
          {medicine?.name ?? 'Medicine'}
        </p>
        {medicine?.strength || log.note ? (
          <p className="truncate text-xs text-muted-foreground">
            {[medicine?.strength, log.note].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>

      <Badge variant={meta.variant} dot>
        {meta.label}
      </Badge>

      {log.taken_at && log.status === 'taken' ? (
        <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
          {formatDateTime(log.taken_at)}
        </span>
      ) : null}
    </li>
  )
}
