import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/dashboard/app-shell'
import { ReminderCenter } from '@/components/reminders/reminder-center'
import { fetchDoseLogsWindow } from '@/lib/data/doses'
import { fetchNotificationPrefs } from '@/lib/data/prefs'
import { fetchMedicines, fetchSchedules } from '@/lib/data/medicines'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/dashboard')
  }

  const now = new Date()
  const windowFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const windowTo = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const [profile, medicines, schedules, logs, prefs] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle(),
    fetchMedicines(supabase, user.id),
    fetchSchedules(supabase, user.id),
    fetchDoseLogsWindow(supabase, user.id, windowFrom, windowTo),
    fetchNotificationPrefs(supabase, user.id),
  ])

  const displayName =
    profile.data?.full_name?.trim() || user.email?.split('@')[0] || 'Reader'
  const displayEmail = profile.data?.email || user.email || ''

  return (
    <AppShell displayName={displayName} displayEmail={displayEmail}>
      <ReminderCenter
        schedules={schedules.filter((schedule) => schedule.active)}
        medicines={medicines}
        logs={logs}
        doseRemindersEnabled={prefs.dose_reminders}
      />
      {children}
    </AppShell>
  )
}
