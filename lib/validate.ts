import { SPINE_COLORS } from '@/lib/constants'
import type { MedicineDraft, MedicineForm, ScheduleDraft } from '@/lib/types'

const FORMS = new Set([
  'tablet',
  'capsule',
  'liquid',
  'cream',
  'drops',
  'inhaler',
  'injection',
  'patch',
  'other',
])

export type NormalizedMedicine = {
  name: string
  strength: string | null
  form: MedicineForm
  color: string
  instructions: string | null
  notes: string | null
  expiry_date: string | null
  barcode: string | null
}

export type NormalizedSchedule = {
  id?: string
  time: string
  dose_label: string | null
  weekdays: number[]
}

function optionalText(value: string, maxLength: number): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  return (
    date.getFullYear() === year &&
    date.getMonth() === (month ?? 1) - 1 &&
    date.getDate() === day
  )
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false
  const [hours, minutes] = value.split(':').map(Number)
  return (
    (hours ?? 24) < 24 && (minutes ?? 60) < 60 && hours >= 0 && minutes >= 0
  )
}

export function normalizeMedicineDraft(
  draft: MedicineDraft,
): { ok: true; value: NormalizedMedicine } | { ok: false; error: string } {
  const name = draft.name.trim()
  if (!name) return { ok: false, error: 'Give this medicine a name.' }
  if (name.length > 160) {
    return { ok: false, error: 'Keep the name under 160 characters.' }
  }

  const strength = optionalText(draft.strength, 80)
  const form = FORMS.has(draft.form) ? draft.form : 'other'
  const color = SPINE_COLORS.some((c) => c.value === draft.color)
    ? draft.color
    : 'teal'

  const expiry = draft.expiry_date.trim()
  if (expiry && !isValidDate(expiry)) {
    return { ok: false, error: 'Enter the expiry date as a real calendar date.' }
  }

  return {
    ok: true,
    value: {
      name,
      strength,
      form,
      color,
      instructions: optionalText(draft.instructions, 1000),
      notes: optionalText(draft.notes, 4000),
      expiry_date: expiry || null,
      barcode: optionalText(draft.barcode, 64),
    },
  }
}

export function normalizeScheduleDrafts(
  drafts: ScheduleDraft[],
): { ok: true; value: NormalizedSchedule[] } | { ok: false; error: string } {
  if (drafts.length > 12) {
    return { ok: false, error: 'Keep it to 12 scheduled times or fewer.' }
  }

  const value: NormalizedSchedule[] = []
  for (const draft of drafts) {
    if (!isValidTime(draft.time)) {
      return { ok: false, error: `“${draft.time || '—'}” is not a valid time.` }
    }

    const weekdays = [...new Set(draft.weekdays)].sort((a, b) => a - b)
    if (weekdays.length === 0) {
      return { ok: false, error: 'Choose at least one day for each schedule.' }
    }
    if (weekdays.some((day) => day < 0 || day > 6)) {
      return { ok: false, error: 'One of the schedule days is invalid.' }
    }

    value.push({
      ...(draft.id ? { id: draft.id } : {}),
      time: draft.time,
      dose_label: optionalText(draft.dose_label, 60),
      weekdays,
    })
  }

  value.sort((a, b) => a.time.localeCompare(b.time))
  return { ok: true, value }
}

export type NormalizedAllergy = {
  name: string
  note: string | null
}

export function normalizeAllergyDraft(
  draft: { name: string; note?: string },
): { ok: true; value: NormalizedAllergy } | { ok: false; error: string } {
  const name = draft.name.trim()
  if (!name) return { ok: false, error: 'Enter what you are allergic to.' }
  if (name.length > 120) {
    return { ok: false, error: 'Keep the allergy under 120 characters.' }
  }
  return {
    ok: true,
    value: { name, note: optionalText(draft.note ?? '', 500) },
  }
}

export function medicineDraftFrom(medicine: {
  name: string
  strength: string | null
  form: string
  color: string
  instructions: string | null
  notes: string | null
  expiry_date: string | null
  barcode: string | null
}): MedicineDraft {
  return {
    name: medicine.name,
    strength: medicine.strength ?? '',
    form: (FORMS.has(medicine.form) ? medicine.form : 'other') as MedicineForm,
    color: medicine.color,
    instructions: medicine.instructions ?? '',
    notes: medicine.notes ?? '',
    expiry_date: medicine.expiry_date ?? '',
    barcode: medicine.barcode ?? '',
  }
}

export function emptyMedicineDraft(): MedicineDraft {
  return {
    name: '',
    strength: '',
    form: 'tablet',
    color: 'teal',
    instructions: '',
    notes: '',
    expiry_date: '',
    barcode: '',
  }
}
