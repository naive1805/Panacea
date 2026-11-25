'use client'

import { Bell, BellOff, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { updateNotificationPrefs } from '@/lib/actions/prefs'
import type { NotificationPrefs } from '@/lib/types'

const LEAD_OPTIONS = [3, 5, 7, 14, 30, 60, 90]

export function ReminderSettings({ prefs }: { prefs: NotificationPrefs }) {
  const router = useRouter()
  const [draft, setDraft] = useState({
    dose_reminders: prefs.dose_reminders,
    expiry_warnings: prefs.expiry_warnings,
    expiry_lead_days: prefs.expiry_lead_days,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'default',
  )

  useEffect(() => {
    // Browser-only value: read it after hydration, off the render path.
    const id = window.setTimeout(() => {
      setPermission(
        typeof Notification === 'undefined'
          ? 'unsupported'
          : Notification.permission,
      )
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function save(patch: Partial<typeof draft>) {
    const next = { ...draft, ...patch }
    setDraft(next)
    setSaving(true)
    setError(null)
    setSaved(false)

    const result = await updateNotificationPrefs(next)
    setSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setSaved(true)
    router.refresh()
  }

  async function requestPermission() {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-lg border border-border/80 bg-card">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="font-serif text-xl font-normal tracking-tight">
            What Panacea reminds you about
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            These preferences follow your account.
          </p>
        </div>

        <div className="divide-y">
          <ToggleRow
            title="Dose reminders"
            description="A browser notification when a scheduled dose comes due."
            checked={draft.dose_reminders}
            onChange={(value) => save({ dose_reminders: value })}
            disabled={saving}
          />
          <ToggleRow
            title="Expiry warnings"
            description="Flag medicines on your shelf as they approach their expiry date."
            checked={draft.expiry_warnings}
            onChange={(value) => save({ expiry_warnings: value })}
            disabled={saving}
          />

          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium">Warn me this many days ahead</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Applies to expiry warnings on Today and the library.
              </p>
            </div>
            <select
              value={draft.expiry_lead_days}
              onChange={(event) =>
                save({ expiry_lead_days: Number(event.target.value) })
              }
              disabled={saving}
              aria-label="Expiry warning lead time in days"
              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-subtle outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-50"
            >
              {Array.from(new Set([...LEAD_OPTIONS, draft.expiry_lead_days]))
                .sort((a, b) => a - b)
                .map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="border-t px-5 py-3">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : saving ? (
            <p className="text-sm text-muted-foreground">Saving…</p>
          ) : saved ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-success">
              <Check className="size-4" />
              Saved
            </p>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/80 bg-card">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="font-serif text-xl font-normal tracking-tight">
            This browser
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Notifications are delivered while Panacea is open in a tab on this
            device.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-accent text-accent-foreground">
              {permission === 'granted' ? (
                <Bell className="size-4" />
              ) : (
                <BellOff className="size-4" />
              )}
            </span>
            <div>
              <p className="text-sm font-medium">
                {permission === 'granted'
                  ? 'Notifications are on'
                  : permission === 'unsupported'
                    ? 'Not supported here'
                    : permission === 'denied'
                      ? 'Blocked by the browser'
                      : 'Notifications are off'}
              </p>
              <p className="mt-0.5 max-w-md text-sm text-muted-foreground">
                {permission === 'denied'
                  ? 'Open your browser settings for this site and allow notifications, then reload.'
                  : 'We will only notify you about doses you have scheduled.'}
              </p>
            </div>
          </div>

          {permission === 'default' ? (
            <button
              type="button"
              onClick={requestPermission}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Bell className="size-4" />
              Turn on
            </button>
          ) : null}
        </div>

        <div className="border-t border-dashed px-5 py-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Panacea does not yet send reminders when the app is closed — no
            emails or server push are configured. Treat it as a companion that
            is open beside you, not an alarm clock.
          </p>
        </div>
      </section>
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
          checked ? 'border-primary bg-primary' : 'border-border-strong bg-muted'
        }`}
      >
        <span
          className={`inline-block size-4 rounded-full bg-card shadow-subtle transition-transform ${
            checked ? 'translate-x-5.5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
