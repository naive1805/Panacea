import { PageHeader } from '@/components/dashboard/page-header'
import { ReminderSettings } from '@/components/reminders/reminder-settings'
import { fetchNotificationPrefs } from '@/lib/data/prefs'
import { requireUserOrRedirect } from '@/lib/server/session'

export const metadata = { title: 'Reminders' }

export default async function RemindersPage() {
  const { supabase, userId } = await requireUserOrRedirect()
  const prefs = await fetchNotificationPrefs(supabase, userId)

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10 lg:py-12">
      <PageHeader
        eyebrow="Reminders"
        title="Gentle nudges"
        description="Choose what Panacea tells you about, and how far ahead it warns you."
      />

      <div className="mt-10">
        <ReminderSettings prefs={prefs} />
      </div>
    </div>
  )
}
