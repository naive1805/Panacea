'use client'

import { Check, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, type ReactNode, useState } from 'react'

import { createMedicine, updateMedicine } from '@/lib/actions/medicines'
import {
  ALL_WEEKDAYS,
  MEDICINE_FORMS,
  SPINE_COLORS,
  suggestSpineColor,
} from '@/lib/constants'
import type { MedicineDraft, MedicineForm, ScheduleDraft } from '@/lib/types'
import { emptyMedicineDraft } from '@/lib/validate'
import { cn } from '@/lib/utils'

type InitialData = {
  medicine: MedicineDraft
  schedules: ScheduleDraft[]
}

type MedicineFormProps = {
  medicineId?: string
  initial?: InitialData
  providerRef?: string
}

export function MedicineForm({ medicineId, initial, providerRef }: MedicineFormProps) {
  const router = useRouter()
  const [colorTouched, setColorTouched] = useState(Boolean(initial))
  const [draft, setDraft] = useState<MedicineDraft>(() => {
    const base = initial?.medicine ?? emptyMedicineDraft()
    // While the spine colour is still untouched, it follows the title.
    return initial ? base : { ...base, color: suggestSpineColor(base.name) }
  })
  const [schedules, setSchedules] = useState<ScheduleDraft[]>(
    () => initial?.schedules ?? [],
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function update<K extends keyof MedicineDraft>(key: K, value: MedicineDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateName(name: string) {
    setDraft((current) => ({
      ...current,
      name,
      color: colorTouched ? current.color : suggestSpineColor(name),
    }))
  }

  function addSchedule() {
    setSchedules((current) => [
      ...current,
      { time: '08:00', dose_label: '', weekdays: [...ALL_WEEKDAYS] },
    ])
  }

  function removeSchedule(index: number) {
    setSchedules((current) => current.filter((_, i) => i !== index))
  }

  function updateSchedule(index: number, patch: Partial<ScheduleDraft>) {
    setSchedules((current) =>
      current.map((schedule, i) =>
        i === index ? { ...schedule, ...patch } : schedule,
      ),
    )
  }

  function toggleWeekday(index: number, day: number) {
    setSchedules((current) =>
      current.map((schedule, i) => {
        if (i !== index) return schedule
        const has = schedule.weekdays.includes(day)
        return {
          ...schedule,
          weekdays: has
            ? schedule.weekdays.filter((d) => d !== day)
            : [...schedule.weekdays, day],
        }
      }),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    const payload = { medicine: draft, schedules, providerRef }
    const result = medicineId
      ? await updateMedicine(medicineId, payload)
      : await createMedicine(payload)

    setSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    router.push(`/dashboard/medicines/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive-soft px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-5">
        <div>
          <span aria-hidden="true" className="mb-2 block h-px w-8 bg-brass" />
          <h2 className="font-serif text-2xl font-normal">The volume</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Name it the way it appears on the box. Everything else is optional.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldBlock label="Medicine name" htmlFor="name" className="sm:col-span-2">
            <input
              id="name"
              required
              value={draft.name}
              onChange={(event) => updateName(event.target.value)}
              placeholder="e.g. Metformin"
              className={inputClass}
            />
          </FieldBlock>

          <FieldBlock label="Strength" htmlFor="strength">
            <input
              id="strength"
              value={draft.strength}
              onChange={(event) => update('strength', event.target.value)}
              placeholder="e.g. 500 mg"
              className={inputClass}
            />
          </FieldBlock>

          <FieldBlock label="Form" htmlFor="form">
            <select
              id="form"
              value={draft.form}
              onChange={(event) => update('form', event.target.value as MedicineForm)}
              className={inputClass}
            >
              {MEDICINE_FORMS.map((form) => (
                <option key={form.value} value={form.value}>
                  {form.label}
                </option>
              ))}
            </select>
          </FieldBlock>

          <FieldBlock
            label="Directions on the label"
            htmlFor="instructions"
            className="sm:col-span-2"
            hint="Copy what your prescriber or pharmacist wrote. Panacea never invents directions."
          >
            <textarea
              id="instructions"
              rows={2}
              value={draft.instructions}
              onChange={(event) => update('instructions', event.target.value)}
              placeholder="e.g. 1 tablet with breakfast"
              className={cn(inputClass, 'h-auto min-h-20 py-2.5')}
            />
          </FieldBlock>

          <FieldBlock label="Expiry date" htmlFor="expiry">
            <input
              id="expiry"
              type="date"
              value={draft.expiry_date}
              onChange={(event) => update('expiry_date', event.target.value)}
              className={inputClass}
            />
          </FieldBlock>

          <FieldBlock
            label="Barcode (optional)"
            htmlFor="barcode"
            hint="Scan a box, or type the number under the bars."
          >
            <input
              id="barcode"
              inputMode="numeric"
              value={draft.barcode}
              onChange={(event) => update('barcode', event.target.value)}
              placeholder="e.g. 5012345678900"
              className={inputClass}
            />
          </FieldBlock>

          <FieldBlock
            label="Personal notes"
            htmlFor="notes"
            className="sm:col-span-2"
            hint="Pharmacy, prescriber, why you take it — anything you want to remember."
          >
            <textarea
              id="notes"
              rows={2}
              value={draft.notes}
              onChange={(event) => update('notes', event.target.value)}
              placeholder="e.g. Repeat prescription, 3 months"
              className={cn(inputClass, 'h-auto min-h-20 py-2.5')}
            />
          </FieldBlock>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">Spine colour</legend>
          <p className="text-xs text-muted-foreground">
            Pick a colour for the spine, or let the title choose one.
          </p>
          <div className="flex flex-wrap gap-2">
            {SPINE_COLORS.map((color) => {
              const selected = draft.color === color.value
              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => {
                    setColorTouched(true)
                    update('color', color.value)
                  }}
                  aria-pressed={selected}
                  aria-label={color.label}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md border transition-transform hover:scale-105',
                    selected
                      ? 'border-foreground ring-2 ring-ring/40'
                      : 'border-border-strong',
                  )}
                  style={{ backgroundColor: color.ink }}
                >
                  {selected ? <Check className="size-4 text-white" /> : null}
                </button>
              )
            })}
          </div>
        </fieldset>
      </section>

      <section className="flex flex-col gap-5 border-t pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span aria-hidden="true" className="mb-2 block h-px w-8 bg-brass" />
            <h2 className="font-serif text-2xl font-normal">Reading hours</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              When should this medicine appear in your day? Leave it empty for
              an as-needed medicine.
            </p>
          </div>
          <button
            type="button"
            onClick={addSchedule}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Plus className="size-4" />
            Add a time
          </button>
        </div>

        {schedules.length === 0 ? (
          <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No times yet — this will live on the shelf without a reminder.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {schedules.map((schedule, index) => (
              <li
                key={schedule.id ?? `new-${index}`}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <FieldBlock label="Time" htmlFor={`time-${index}`}>
                    <input
                      id={`time-${index}`}
                      type="time"
                      value={schedule.time}
                      onChange={(event) =>
                        updateSchedule(index, { time: event.target.value })
                      }
                      className={cn(inputClass, 'w-36')}
                    />
                  </FieldBlock>

                  <FieldBlock
                    label="Label (optional)"
                    htmlFor={`label-${index}`}
                    className="min-w-40 flex-1"
                  >
                    <input
                      id={`label-${index}`}
                      value={schedule.dose_label}
                      onChange={(event) =>
                        updateSchedule(index, { dose_label: event.target.value })
                      }
                      placeholder="e.g. 1 tablet"
                      className={inputClass}
                    />
                  </FieldBlock>

                  <button
                    type="button"
                    onClick={() => removeSchedule(index)}
                    aria-label="Remove this time"
                    className="flex size-10 items-center justify-center rounded-md border border-border-strong text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Days</span>
                  {ALL_WEEKDAYS.map((day) => {
                    const active = schedule.weekdays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeekday(index, day)}
                        aria-pressed={active}
                        aria-label={WEEKDAY_NAMES[day]}
                        className={cn(
                          'flex size-8 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                          active
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border-strong text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {WEEKDAY_INITIALS[day]}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      updateSchedule(index, { weekdays: [...ALL_WEEKDAYS] })
                    }
                    className="ml-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Every day
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-subtle transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {saving
            ? 'Saving…'
            : medicineId
              ? 'Save changes'
              : `Shelve “${draft.name.trim() || 'this medicine'}”`}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 items-center justify-center rounded-md border border-border-strong bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

const inputClass =
  'h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-subtle transition-colors outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50'

function FieldBlock({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

