import { describe, expect, it } from 'vitest'

import { normalizeMedicineDraft, normalizeScheduleDrafts } from '@/lib/validate'
import type { MedicineDraft, ScheduleDraft } from '@/lib/types'

const medicineDraft: MedicineDraft = {
  name: '  Metformin  ',
  strength: ' 500 mg ',
  form: 'tablet',
  color: 'teal',
  instructions: '',
  notes: '',
  expiry_date: '',
  barcode: '',
}

describe('medicine validation', () => {
  it('trims names and converts optional empty fields to null', () => {
    expect(normalizeMedicineDraft(medicineDraft)).toMatchObject({
      ok: true,
      value: { name: 'Metformin', strength: '500 mg', instructions: null, notes: null },
    })
  })

  it('rejects missing or overlong names and invalid calendar dates', () => {
    expect(normalizeMedicineDraft({ ...medicineDraft, name: '  ' })).toMatchObject({ ok: false })
    expect(normalizeMedicineDraft({ ...medicineDraft, name: 'x'.repeat(161) })).toMatchObject({ ok: false })
    expect(normalizeMedicineDraft({ ...medicineDraft, expiry_date: '2026-02-30' })).toMatchObject({ ok: false })
  })

  it('uses safe defaults for an unsupported form or color', () => {
    expect(normalizeMedicineDraft({ ...medicineDraft, form: 'invalid' as MedicineDraft['form'], color: 'invalid' })).toMatchObject({
      ok: true,
      value: { form: 'other', color: 'teal' },
    })
  })
})

describe('schedule validation', () => {
  it('validates time and weekday ranges, then de-duplicates and sorts weekdays', () => {
    const input: ScheduleDraft[] = [{ time: '08:30', dose_label: 'Morning', weekdays: [5, 1, 5] }]
    expect(normalizeScheduleDrafts(input)).toMatchObject({
      ok: true,
      value: [{ time: '08:30', weekdays: [1, 5] }],
    })
    expect(normalizeScheduleDrafts([{ ...input[0]!, time: '24:00' }])).toMatchObject({ ok: false })
    expect(normalizeScheduleDrafts([{ ...input[0]!, weekdays: [7] }])).toMatchObject({ ok: false })
    expect(normalizeScheduleDrafts([{ ...input[0]!, weekdays: [] }])).toMatchObject({ ok: false })
  })

  it('rejects more than twelve schedule times', () => {
    const schedules = Array.from({ length: 13 }, (_, index) => ({
      time: `${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`,
      dose_label: '',
      weekdays: [0],
    }))
    expect(normalizeScheduleDrafts(schedules)).toMatchObject({ ok: false })
  })
})
