'use client'

import { useEffect, useRef } from 'react'

import { buildTodayDoses } from '@/lib/doses'
import type { DoseLog, Medicine, Schedule } from '@/lib/types'

type ReminderCenterProps = {
  schedules: Schedule[]
  medicines: Medicine[]
  logs: DoseLog[]
  doseRemindersEnabled: boolean
}

const NOTIFIED_KEY = 'panacea:notified-doses'
const LEAD_MINUTES = 5

/**
 * Fires a browser notification when a scheduled dose comes due. Runs quietly
 * in the dashboard shell; renders nothing.
 */
export function ReminderCenter({
  schedules,
  medicines,
  logs,
  doseRemindersEnabled,
}: ReminderCenterProps) {
  const notified = useRef<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NOTIFIED_KEY)
      if (raw) {
        for (const key of JSON.parse(raw) as string[]) notified.current.add(key)
      }
    } catch {
      // Storage unavailable — in-memory tracking still works.
    }
  }, [])

  useEffect(() => {
    if (!doseRemindersEnabled) return
    if (typeof Notification === 'undefined') return

    let cancelled = false

    function notify(key: string, title: string, body: string) {
      notified.current.add(key)
      try {
        sessionStorage.setItem(
          NOTIFIED_KEY,
          JSON.stringify([...notified.current].slice(-200)),
        )
      } catch {
        // Ignore storage failures.
      }
      try {
        if (Notification.permission === 'granted') {
          new Notification(title, { body, tag: key })
        }
      } catch {
        // Some browsers require a service worker for notifications.
      }
    }

    function tick() {
      if (cancelled) return
      const now = new Date()
      const doses = buildTodayDoses({ schedules, medicines, logs, now })

      for (const dose of doses) {
        const key = `${dose.schedule?.id ?? dose.medicine.id}|${dose.slot.toISOString()}`
        if (notified.current.has(key)) continue
        if (dose.status !== 'due' && dose.status !== 'missed') continue

        const minutesUntil = (dose.slot.getTime() - now.getTime()) / 60_000
        if (minutesUntil > LEAD_MINUTES) continue
        if (dose.status !== 'missed' && minutesUntil < -60) continue

        notify(
          key,
          `Time for ${dose.medicine.name}`,
          [dose.medicine.strength, dose.doseLabel].filter(Boolean).join(' · ') ||
            'Your dose is due now.',
        )
      }
    }

    tick()
    const id = setInterval(tick, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [doseRemindersEnabled, logs, medicines, schedules])

  return null
}
