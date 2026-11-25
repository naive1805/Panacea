import { EXPIRY_WARNING_DAYS, SNOOZE_MINUTES } from '@/lib/constants'
import type { DoseLog, Medicine, Schedule } from '@/lib/types'

export type TodayDoseStatus =
  | 'taken'
  | 'skipped'
  | 'snoozed'
  | 'due'
  | 'upcoming'
  | 'missed'

export type TodayDose = {
  key: string
  medicine: Medicine
  schedule: Schedule | null
  time: string
  slot: Date
  doseLabel: string | null
  status: TodayDoseStatus
  logId: string | null
  takenAt: string | null
  snoozedUntil: string | null
}

const GRACE_MINUTES = 60

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function combineDateAndTime(date: string, time: string): Date {
  const base = parseLocalDate(date)
  const [hours, minutes] = time.split(':').map(Number)
  base.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return base
}

export function formatClockTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDayLabel(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const today = toLocalDateString(new Date())
  const target = toLocalDateString(date)
  if (today === target) return 'Today'
  const yesterday = toLocalDateString(new Date(Date.now() - 86_400_000))
  if (yesterday === target) return 'Yesterday'
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function isScheduleActiveOn(schedule: Schedule, date: Date): boolean {
  if (!schedule.active) return false
  const weekday = date.getDay()
  if (!schedule.weekdays.includes(weekday)) return false
  const start = parseLocalDate(schedule.start_date)
  start.setHours(0, 0, 0, 0)
  const today = new Date(date)
  today.setHours(0, 0, 0, 0)
  return today.getTime() >= start.getTime()
}

export function daysUntil(expiryDate: string, now: Date = new Date()): number {
  const target = parseLocalDate(expiryDate)
  target.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export type ExpiryMeta = {
  tone: 'ok' | 'warning' | 'danger'
  label: string
}

export function expiryMeta(
  expiryDate: string | null,
  leadDays: number = EXPIRY_WARNING_DAYS,
  now: Date = new Date(),
): ExpiryMeta | null {
  if (!expiryDate) return null
  const remaining = daysUntil(expiryDate, now)
  if (remaining < 0) {
    return { tone: 'danger', label: 'Expired' }
  }
  if (remaining === 0) {
    return { tone: 'danger', label: 'Expires today' }
  }
  if (remaining === 1) {
    return { tone: 'warning', label: 'Expires tomorrow' }
  }
  if (remaining <= leadDays) {
    return { tone: 'warning', label: `${remaining} days left` }
  }
  return { tone: 'ok', label: `Expires ${formatDate(expiryDate)}` }
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? parseLocalDate(value) : value
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusForSlot(
  slot: Date,
  log: DoseLog | undefined,
  now: Date,
): TodayDoseStatus {
  if (log) {
    if (log.status === 'snoozed') {
      const until = log.snoozed_until ? new Date(log.snoozed_until) : null
      if (until && until.getTime() > now.getTime()) return 'snoozed'
      return now.getTime() >= slot.getTime() ? 'due' : 'upcoming'
    }
    return log.status
  }

  const elapsed = now.getTime() - slot.getTime()
  if (elapsed < -15 * 60_000) return 'upcoming'
  if (elapsed <= GRACE_MINUTES * 60_000) return 'due'
  return 'missed'
}

export type TodayDoseInput = {
  schedules: Schedule[]
  medicines: Medicine[]
  logs: DoseLog[]
  now?: Date
}

export function buildTodayDoses({
  schedules,
  medicines,
  logs,
  now = new Date(),
}: TodayDoseInput): TodayDose[] {
  const medicineById = new Map(medicines.map((m) => [m.id, m]))
  // Key on the instant, not the string: Postgres returns timestamptz as
  // "…+00:00" while Date#toISOString emits "…Z" for the same moment.
  const logBySlot = new Map(
    logs
      .filter((log) => log.schedule_id)
      .map((log) => [
        `${log.schedule_id}|${new Date(log.scheduled_for).getTime()}`,
        log,
      ]),
  )

  const today = toLocalDateString(now)
  const doses: TodayDose[] = []

  for (const schedule of schedules) {
    const medicine = medicineById.get(schedule.medicine_id)
    if (!medicine || medicine.archived_at) continue
    if (!isScheduleActiveOn(schedule, now)) continue

    const slot = combineDateAndTime(today, schedule.time)
    const log = logBySlot.get(`${schedule.id}|${slot.getTime()}`)
    const snoozedUntil = log?.snoozed_until ? new Date(log.snoozed_until) : null

    doses.push({
      key: schedule.id,
      medicine,
      schedule,
      time: schedule.time,
      slot,
      doseLabel: schedule.dose_label,
      status: statusForSlot(slot, log, now),
      logId: log?.id ?? null,
      takenAt: log?.taken_at ?? null,
      snoozedUntil:
        snoozedUntil && snoozedUntil.getTime() > now.getTime()
          ? snoozedUntil.toISOString()
          : null,
    })
  }

  doses.sort((a, b) => a.slot.getTime() - b.slot.getTime())
  return doses
}

export function nextDoseOf(doses: TodayDose[]): TodayDose | null {
  const upcoming = doses.filter(
    (dose) => dose.status === 'due' || dose.status === 'upcoming',
  )
  return upcoming[0] ?? null
}

export function relativeToNow(date: Date, now: Date = new Date()): string {
  const diffMinutes = Math.round((date.getTime() - now.getTime()) / 60_000)
  const past = diffMinutes < 0
  const minutes = Math.abs(diffMinutes)
  if (minutes < 1) return past ? 'just now' : 'in under a minute'
  if (minutes < 60) {
    return past ? `${minutes} min ago` : `in ${minutes} min`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return past ? `${hours} h ago` : `in ${hours} h`
  }
  const days = Math.round(hours / 24)
  return past ? `${days} d ago` : `in ${days} d`
}

export function snoozeTarget(from: Date = new Date()): Date {
  return new Date(from.getTime() + SNOOZE_MINUTES * 60_000)
}
