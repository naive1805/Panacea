import { describe, expect, it } from 'vitest'

import {
  buildTodayDoses,
  expiryMeta,
  isScheduleActiveOn,
  toLocalDateString,
} from '@/lib/doses'
import type { DoseLog, Medicine, Schedule } from '@/lib/types'

const now = new Date(2026, 10, 25, 10, 0, 0)

const medicine: Medicine = {
  id: 'medicine-1',
  user_id: 'user-1',
  name: 'Example medicine',
  strength: null,
  form: 'tablet',
  color: 'teal',
  instructions: null,
  notes: null,
  expiry_date: null,
  barcode: null,
  source: 'manual',
  provider_ref: null,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
  archived_at: null,
}

function schedule(time: string, weekdays = [now.getDay()]): Schedule {
  return {
    id: 'schedule-1',
    user_id: 'user-1',
    medicine_id: medicine.id,
    time,
    weekdays,
    dose_label: null,
    active: true,
    start_date: toLocalDateString(now),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }
}

function log(status: DoseLog['status'], overrides: Partial<DoseLog> = {}): DoseLog {
  return {
    id: 'log-1',
    user_id: 'user-1',
    medicine_id: medicine.id,
    schedule_id: 'schedule-1',
    scheduled_for: new Date(2026, 10, 25, 10, 0).toISOString(),
    status,
    taken_at: null,
    snoozed_until: null,
    note: null,
    created_at: now.toISOString(),
    ...overrides,
  }
}

function statusAt(time: string, currentTime = now, logs: DoseLog[] = []) {
  const [hours, minutes] = time.split(':').map(Number)
  const scheduledFor = new Date(2026, 10, 25, hours, minutes).toISOString()
  return buildTodayDoses({
    schedules: [schedule(time)],
    medicines: [medicine],
    logs: logs.map((entry) => ({ ...entry, scheduled_for: scheduledFor })),
    now: currentTime,
  })[0]?.status
}

describe('dose status rules', () => {
  it('shows scheduled doses as upcoming more than 15 minutes early', () => {
    expect(statusAt('10:16')).toBe('upcoming')
  })

  it('marks a dose due from 15 minutes before through the 60-minute grace period', () => {
    expect(statusAt('10:15')).toBe('due')
    expect(statusAt('09:00')).toBe('due')
  })

  it('marks an unrecorded dose missed after the 60-minute grace period', () => {
    expect(statusAt('08:59')).toBe('missed')
  })

  it.each(['taken', 'skipped'] as const)('preserves the recorded %s status', (status) => {
    expect(statusAt('09:00', now, [log(status)])).toBe(status)
  })

  it('keeps a snoozed dose snoozed until its deadline, then makes it due', () => {
    expect(
      statusAt('09:55', now, [log('snoozed', { snoozed_until: new Date(2026, 10, 25, 10, 5).toISOString() })]),
    ).toBe('snoozed')
    expect(
      statusAt('09:55', now, [log('snoozed', { snoozed_until: new Date(2026, 10, 25, 9, 59).toISOString() })]),
    ).toBe('due')
  })
})

describe('schedule weekdays', () => {
  it('uses local Sunday-through-Saturday weekday numbers and the start date', () => {
    const sunday = new Date(2026, 10, 29, 9)
    expect(isScheduleActiveOn(schedule('09:00', [0]), sunday)).toBe(true)
    expect(isScheduleActiveOn(schedule('09:00', [1]), sunday)).toBe(false)
    expect(isScheduleActiveOn({ ...schedule('09:00', [0]), start_date: '2026-11-30' }, sunday)).toBe(false)
  })
})

describe('expiry labels', () => {
  const today = new Date(2026, 10, 25, 12)

  it('labels expired, today, tomorrow, warning-window, and distant dates', () => {
    expect(expiryMeta('2026-11-24', 5, today)).toEqual({ tone: 'danger', label: 'Expired' })
    expect(expiryMeta('2026-11-25', 5, today)).toEqual({ tone: 'danger', label: 'Expires today' })
    expect(expiryMeta('2026-11-26', 5, today)).toEqual({ tone: 'warning', label: 'Expires tomorrow' })
    expect(expiryMeta('2026-11-30', 5, today)).toEqual({ tone: 'warning', label: '5 days left' })
    expect(expiryMeta('2026-12-10', 5, today)?.tone).toBe('ok')
  })

  it('returns no label when no expiry date is saved', () => {
    expect(expiryMeta(null, 5, today)).toBeNull()
  })
})
