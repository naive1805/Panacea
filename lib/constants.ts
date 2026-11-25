import type { MedicineForm } from '@/lib/types'

export const MEDICINE_FORMS: { value: MedicineForm; label: string }[] = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'cream', label: 'Cream / gel' },
  { value: 'drops', label: 'Drops' },
  { value: 'inhaler', label: 'Inhaler' },
  { value: 'injection', label: 'Injection' },
  { value: 'patch', label: 'Patch' },
  { value: 'other', label: 'Other' },
]

export const FORM_LABELS = Object.fromEntries(
  MEDICINE_FORMS.map((f) => [f.value, f.label]),
) as Record<MedicineForm, string>

// Book-spine colours. Warm, print-like hues that read well on a shelf.
export const SPINE_COLORS: { value: string; label: string; ink: string }[] = [
  { value: 'teal', label: 'Teal', ink: '#2f6f66' },
  { value: 'forest', label: 'Forest', ink: '#3d6b45' },
  { value: 'clay', label: 'Clay', ink: '#a4553b' },
  { value: 'plum', label: 'Plum', ink: '#7a4a63' },
  { value: 'indigo', label: 'Indigo', ink: '#45507f' },
  { value: 'ochre', label: 'Ochre', ink: '#a87a2b' },
  { value: 'slate', label: 'Slate', ink: '#5b6470' },
  { value: 'rose', label: 'Rose', ink: '#a3586a' },
]

export const SPINE_INK = Object.fromEntries(
  SPINE_COLORS.map((c) => [c.value, c.ink]),
) as Record<string, string>

export function spineInk(color: string | null | undefined): string {
  return SPINE_INK[color ?? ''] ?? SPINE_INK.teal
}

// Deterministic spine colour for a medicine name, so the shelf looks varied
// even when the reader never picks one.
export function suggestSpineColor(name: string): string {
  const key = name.trim().toLowerCase()
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100_000
  }
  return SPINE_COLORS[hash % SPINE_COLORS.length].value
}

export const WEEKDAYS = [
  { value: 0, short: 'S', long: 'Sunday' },
  { value: 1, short: 'M', long: 'Monday' },
  { value: 2, short: 'T', long: 'Tuesday' },
  { value: 3, short: 'W', long: 'Wednesday' },
  { value: 4, short: 'T', long: 'Thursday' },
  { value: 5, short: 'F', long: 'Friday' },
  { value: 6, short: 'S', long: 'Saturday' },
] as const

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

export const SNOOZE_MINUTES = 10

export const EXPIRY_WARNING_DAYS = 5
