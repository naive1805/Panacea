import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'

import { DoseHistory } from '@/components/history/dose-history'
import { AllergyPanel } from '@/components/library/allergy-panel'
import { MedicineActions } from '@/components/library/medicine-actions'
import { MedicineIntelligence } from '@/components/library/medicine-intelligence'
import { Badge } from '@/components/ui/badge'
import { FORM_LABELS, spineInk } from '@/lib/constants'
import { fetchAllergies } from '@/lib/data/allergies'
import { fetchMedicineDoseLogs } from '@/lib/data/doses'
import { fetchMedicine, fetchSchedulesForMedicines } from '@/lib/data/medicines'
import { fetchNotificationPrefs } from '@/lib/data/prefs'
import { expiryMeta, formatDate, formatClockTime, relativeToNow } from '@/lib/doses'
import { requireUserOrRedirect } from '@/lib/server/session'

type MedicineDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function MedicineDetailPage({
  params,
}: MedicineDetailPageProps) {
  const { id } = await params
  const { supabase, userId } = await requireUserOrRedirect()

  const [medicine, schedules, logs, prefs, allergyResult] = await Promise.all([
    fetchMedicine(supabase, userId, id),
    fetchSchedulesForMedicines(supabase, userId, [id]),
    fetchMedicineDoseLogs(supabase, userId, id, 10),
    fetchNotificationPrefs(supabase, userId),
    fetchAllergies(supabase, userId)
      .then((data) => ({ data, error: false }))
      .catch(() => ({ data: [], error: true })),
  ])
  const allergies = allergyResult.data

  if (!medicine) {
    notFound()
  }

  const ink = spineInk(medicine.color)
  const expiry = expiryMeta(medicine.expiry_date, prefs.expiry_lead_days)
  const activeSchedules = schedules.filter((schedule) => schedule.active)

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10 lg:py-12">
      <Link
        href="/dashboard/medicines"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" />
        Library
      </Link>

      {medicine.archived_at ? (
        <p className="mt-6 rounded-md border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning">
          This volume is off the shelf — archived on{' '}
          {formatDate(medicine.archived_at)}. Restore it to see it in your day
          again.
        </p>
      ) : null}

      <header className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-start">
        <div className="book-cover relative flex min-h-56 flex-col justify-between overflow-hidden rounded-r-xl rounded-l-md border border-border-strong p-6 pl-7 shadow-subtle">
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
            className="pointer-events-none absolute inset-0 rounded-r-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
          />
          <div className="relative">
            <p className="text-[0.7rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              {FORM_LABELS[medicine.form]}
            </p>
            <span aria-hidden="true" className="mt-2 block h-px w-10 bg-brass/70" />
            <h1 className="mt-4 font-serif text-3xl leading-[1.08] font-normal tracking-tight text-balance text-foreground sm:text-4xl">
              {medicine.name}
            </h1>
            {medicine.strength ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {medicine.strength}
              </p>
            ) : null}
          </div>
          <p className="relative mt-8 text-[0.68rem] tracking-[0.16em] text-muted-foreground uppercase">
            A volume in your library
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:pt-2">
          {medicine.instructions ? (
            <p className="max-w-2xl font-serif text-lg leading-relaxed text-muted-foreground italic">
              {medicine.instructions}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {expiry ? (
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
            {activeSchedules.length > 0 ? (
              <Badge variant="accent" dot>
                {activeSchedules.length}{' '}
                {activeSchedules.length === 1 ? 'time' : 'times'} a day
              </Badge>
            ) : (
              <Badge variant="outline">As needed</Badge>
            )}
          </div>

          <MedicineActions
            medicineId={medicine.id}
            archived={Boolean(medicine.archived_at)}
          />
        </div>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-3">
        <div className="flex flex-col gap-10 lg:col-span-2">
          {medicine.notes ? (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2.5 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                <span aria-hidden="true" className="h-px w-5 bg-brass" />
                In the margin
              </h2>
              <div className="rounded-lg border bg-card p-5">
                <p className="text-sm leading-7 whitespace-pre-wrap text-foreground">
                  {medicine.notes}
                </p>
              </div>
            </section>
          ) : null}

          <AllergyPanel initialAllergies={allergies} loadError={allergyResult.error} />

          <MedicineIntelligence
            medicineId={medicine.id}
            name={medicine.name}
            strength={medicine.strength}
            providerRef={medicine.provider_ref}
            allergies={allergies}
          />

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Recent reading
            </h2>
            <DoseHistory
              logs={logs}
              medicines={[medicine]}
              emptyMessage="No doses recorded for this medicine yet."
            />
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Reading hours
            </h2>
            {activeSchedules.length > 0 ? (
              <ul className="flex flex-col divide-y rounded-lg border bg-card">
                {activeSchedules.map((schedule) => (
                  <li
                    key={schedule.id}
                    className="flex items-baseline justify-between gap-3 px-4 py-3"
                  >
                    <span className="font-serif text-xl text-foreground tabular-nums">
                      {formatClockTime(schedule.time)}
                    </span>
                    <span className="text-right text-xs text-muted-foreground">
                      {schedule.dose_label ?? 'No label'}
                      <br />
                      {describeWeekdays(schedule.weekdays)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No schedule — take as needed.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Imprint
            </h2>
            <dl className="flex flex-col gap-3 rounded-lg border bg-card p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Form</dt>
                <dd className="text-right font-medium">{FORM_LABELS[medicine.form]}</dd>
              </div>
              {medicine.strength ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Strength</dt>
                  <dd className="text-right font-medium">{medicine.strength}</dd>
                </div>
              ) : null}
              {medicine.expiry_date ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd className="text-right font-medium">
                    {formatDate(medicine.expiry_date)}
                  </dd>
                </div>
              ) : null}
              {medicine.barcode ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Barcode</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {medicine.barcode}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Added</dt>
                <dd className="text-right font-medium">
                  {formatDate(medicine.created_at)}
                </dd>
              </div>
              {medicine.updated_at !== medicine.created_at ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd className="text-right font-medium">
                    {relativeToNow(new Date(medicine.updated_at))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}

function describeWeekdays(weekdays: number[]): string {
  const sorted = [...new Set(weekdays)].sort((a, b) => a - b)
  if (sorted.length === 7) return 'Every day'
  if (sorted.length === 5 && [1, 2, 3, 4, 5].every((d) => sorted.includes(d))) {
    return 'Weekdays'
  }
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) {
    return 'Weekends'
  }
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return sorted.map((day) => names[day]).join(', ')
}
