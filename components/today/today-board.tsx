'use client'

import { Check, Pill, Plus, ScanBarcode, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { logDose, undoDoseLog } from '@/lib/actions/doses'
import { spineInk } from '@/lib/constants'
import {
  buildTodayDoses,
  expiryMeta,
  formatClockTime,
  nextDoseOf,
  relativeToNow,
  type TodayDose,
} from '@/lib/doses'
import type { DoseLog, Medicine, Schedule } from '@/lib/types'
import { cn } from '@/lib/utils'

type TodayBoardProps = {
  schedules: Schedule[]
  medicines: Medicine[]
  logs: DoseLog[]
  expiringMedicines: Medicine[]
  /** Days ahead the account is warned about expiry (from notification prefs). */
  expiryLeadDays?: number
  /** Server clock, used for the first paint so SSR and hydration agree. */
  serverNow: Date
}

export function TodayBoard({
  schedules,
  medicines,
  logs,
  expiringMedicines,
  expiryLeadDays,
  serverNow,
}: TodayBoardProps) {
  const router = useRouter()
  const [clientNow, setClientNow] = useState<Date | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // First tick is deferred so SSR and the hydration pass both paint the
    // server clock; the client clock takes over immediately after.
    const first = window.setTimeout(() => setClientNow(new Date()), 0)
    const id = window.setInterval(() => setClientNow(new Date()), 30_000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [])

  const now = clientNow ?? serverNow

  const doses = useMemo(
    () => buildTodayDoses({ schedules, medicines, logs, now }),
    [schedules, medicines, logs, now],
  )

  const takenCount = doses.filter((dose) => dose.status === 'taken').length
  const next = nextDoseOf(doses)
  const progress = doses.length > 0 ? (takenCount / doses.length) * 100 : 0

  async function act(
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setPending(key)
    setError(null)
    const result = await fn()
    setPending(null)
    if (!result.ok) {
      setError(result.error ?? 'That did not save. Try again.')
      return
    }
    router.refresh()
  }

  const markTaken = (dose: TodayDose) =>
    act(`taken-${dose.key}`, () =>
      logDose({
        medicineId: dose.medicine.id,
        scheduleId: dose.schedule?.id ?? null,
        scheduledFor: dose.slot.toISOString(),
        status: 'taken',
      }),
    )

  const markSkipped = (dose: TodayDose) =>
    act(`skip-${dose.key}`, () =>
      logDose({
        medicineId: dose.medicine.id,
        scheduleId: dose.schedule?.id ?? null,
        scheduledFor: dose.slot.toISOString(),
        status: 'skipped',
      }),
    )

  const snooze = (dose: TodayDose) =>
    act(`snooze-${dose.key}`, () =>
      logDose({
        medicineId: dose.medicine.id,
        scheduleId: dose.schedule?.id ?? null,
        scheduledFor: dose.slot.toISOString(),
        status: 'snoozed',
      }),
    )

  const undo = (dose: TodayDose) =>
    act(`undo-${dose.key}`, async () => {
      if (!dose.logId) return { ok: false, error: 'Nothing to undo.' }
      return undoDoseLog(dose.logId)
    })

  const today = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <p className="mt-1 font-serif text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
            Today&apos;s reading
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/medicines/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-subtle transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Add medicine
          </Link>
          <Link
            href="/dashboard/scan"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ScanBarcode className="size-4" />
            Scan
          </Link>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/20 bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <dl className="grid gap-px overflow-hidden rounded-lg border border-border/80 bg-border/70 sm:grid-cols-3">
        <div className="flex flex-col gap-2 bg-card px-5 py-4">
          <dt className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Doses today
          </dt>
          <dd className="font-serif text-3xl font-normal tabular-nums">
            {takenCount}
            <span className="text-muted-foreground"> / {doses.length}</span>
          </dd>
          <dd className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </dd>
        </div>

        <div className="flex flex-col gap-2 bg-card px-5 py-4">
          <dt className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            On the shelf
          </dt>
          <dd className="font-serif text-3xl font-normal tabular-nums">
            {medicines.length}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {medicines.length === 1
              ? '1 active medicine'
              : `${medicines.length} active medicines`}
          </dd>
        </div>

        <div className="flex flex-col gap-2 bg-card px-5 py-4">
          <dt className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Expiring soon
          </dt>
          <dd className="font-serif text-3xl font-normal tabular-nums">
            {expiringMedicines.length}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {expiringMedicines.length === 0
              ? 'No expiry alerts right now.'
              : 'Worth checking this week.'}
          </dd>
        </div>
      </dl>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="overflow-hidden rounded-lg border border-border/80 bg-card lg:col-span-3">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-serif text-xl font-normal tracking-tight">
              Today&apos;s medications
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {doses.length === 0
                ? 'Nothing is scheduled for today.'
                : 'Mark each dose as you go — the record stays with you.'}
            </p>
          </div>

          {doses.length > 0 ? (
            <ul className="divide-y">
              {doses.map((dose) => (
                <DoseRow
                  key={dose.key}
                  dose={dose}
                  pending={pending}
                  onTaken={() => markTaken(dose)}
                  onSkipped={() => markSkipped(dose)}
                  onSnooze={() => snooze(dose)}
                  onUndo={() => undo(dose)}
                />
              ))}
            </ul>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="font-serif text-2xl font-normal">Nothing scheduled</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Add a medicine with a reading hour and it will appear here each
                day it is due.
              </p>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <NextDoseCard dose={next} onTaken={() => next && markTaken(next)} pending={pending === `taken-${next?.key}`} />
          <ExpiryCard medicines={expiringMedicines} leadDays={expiryLeadDays} />
        </div>
      </div>
    </div>
  )
}

function DoseRow({
  dose,
  pending,
  onTaken,
  onSkipped,
  onSnooze,
  onUndo,
}: {
  dose: TodayDose
  pending: string | null
  onTaken: () => void
  onSkipped: () => void
  onSnooze: () => void
  onUndo: () => void
}) {
  const ink = spineInk(dose.medicine.color)
  const busy = pending !== null
  const taken = dose.status === 'taken'
  const missed = dose.status === 'missed'

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-4">
      <span className="w-14 shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
        {formatClockTime(dose.time)}
      </span>

      <span
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-md border',
          taken
            ? 'border-success/20 bg-success-soft text-success'
            : 'bg-muted text-muted-foreground',
        )}
        style={
          taken
            ? undefined
            : { borderColor: `${ink}33`, backgroundColor: `${ink}14`, color: ink }
        }
      >
        {taken ? <Check className="size-4" /> : <Pill className="size-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate">
          <Link
            href={`/dashboard/medicines/${dose.medicine.id}`}
            className="font-serif text-lg leading-snug font-normal underline-offset-4 hover:underline"
          >
            {dose.medicine.name}
          </Link>
          {dose.medicine.strength ? (
            <span className="ml-2 text-sm text-muted-foreground">
              {dose.medicine.strength}
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {dose.doseLabel ?? dose.medicine.instructions ?? 'As directed'}
          {dose.snoozedUntil
            ? ` · snoozed until ${new Date(dose.snoozedUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : ''}
        </p>
      </div>

      <DoseBadge status={dose.status} />

      <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
        {taken ? (
          <button
            type="button"
            onClick={onUndo}
            disabled={busy}
            className="h-8 rounded-md border border-border-strong bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Undo
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onTaken}
              disabled={busy}
              className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {pending === `taken-${dose.key}` ? 'Saving…' : 'Mark as taken'}
            </button>
            {dose.status === 'due' || dose.status === 'snoozed' || missed ? null : (
              <button
                type="button"
                onClick={onSnooze}
                disabled={busy}
                className="h-8 rounded-md border border-border-strong bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Snooze
              </button>
            )}
            <button
              type="button"
              onClick={onSkipped}
              disabled={busy}
              className="h-8 rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Skip
            </button>
          </>
        )}
      </div>
    </li>
  )
}

function DoseBadge({ status }: { status: TodayDose['status'] }) {
  switch (status) {
    case 'taken':
      return (
        <Badge variant="success" dot className="hidden sm:inline-flex">
          Taken
        </Badge>
      )
    case 'due':
      return (
        <Badge variant="accent" dot className="hidden sm:inline-flex">
          Due now
        </Badge>
      )
    case 'snoozed':
      return (
        <Badge variant="accent" dot className="hidden sm:inline-flex">
          Snoozed
        </Badge>
      )
    case 'missed':
      return (
        <Badge variant="danger" dot className="hidden sm:inline-flex">
          Missed
        </Badge>
      )
    default:
      return (
        <Badge variant="neutral" className="hidden sm:inline-flex">
          Scheduled
        </Badge>
      )
  }
}

function NextDoseCard({
  dose,
  onTaken,
  pending,
}: {
  dose: TodayDose | null
  onTaken: () => void
  pending: boolean
}) {
  if (!dose) {
    return (
      <section className="rounded-lg border border-border/80 bg-card">
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="font-serif text-base font-normal tracking-tight">
            Up next
          </h2>
        </div>
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing else due today.
        </p>
      </section>
    )
  }

  const until = relativeToNow(dose.slot)

  return (
    <section className="rounded-lg border border-border/80 bg-card">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <h2 className="font-serif text-base font-normal tracking-tight">
          Up next
        </h2>
        <span className="text-xs text-muted-foreground">{until}</span>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-serif text-xl font-normal text-foreground">
              {dose.medicine.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[dose.medicine.strength, dose.doseLabel].filter(Boolean).join(' · ') ||
                'As directed'}
            </p>
          </div>
          <p className="font-serif text-2xl text-primary tabular-nums">
            {formatClockTime(dose.time)}
          </p>
        </div>
        <button
          type="button"
          onClick={onTaken}
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Mark as taken'}
        </button>
      </div>
    </section>
  )
}

function ExpiryCard({
  medicines,
  leadDays,
}: {
  medicines: Medicine[]
  leadDays?: number
}) {
  if (medicines.length === 0) {
    return (
      <section className="rounded-lg border border-border/80 bg-card">
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="font-serif text-base font-normal tracking-tight">
            Expiry awareness
          </h2>
        </div>
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing is close to its expiry date.
        </p>
      </section>
    )
  }

  const first = medicines[0]
  const meta =
    leadDays === undefined
      ? expiryMeta(first.expiry_date)
      : expiryMeta(first.expiry_date, leadDays)

  return (
    <section className="rounded-lg border border-border/80 bg-card">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <h2 className="font-serif text-base font-normal tracking-tight">
          Expiry awareness
        </h2>
        {medicines.length > 1 ? (
          <span className="text-xs text-muted-foreground">
            +{medicines.length - 1} more
          </span>
        ) : null}
      </div>
      <div className="flex items-start gap-3 p-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-warning/25 bg-warning-soft text-warning">
          <TriangleAlert className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            <Link
              href={`/dashboard/medicines/${first.id}`}
              className="underline-offset-4 hover:underline"
            >
              {first.name}
            </Link>
            {first.strength ? (
              <span className="ml-1.5 font-normal text-muted-foreground">
                {first.strength}
              </span>
            ) : null}
          </p>
          {meta ? (
            <Badge variant={meta.tone === 'ok' ? 'neutral' : meta.tone} className="mt-2">
              {meta.label}
            </Badge>
          ) : null}
        </div>
      </div>
    </section>
  )
}
