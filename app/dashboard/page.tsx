import { TodayBoard } from '@/components/today/today-board'
import { fetchDoseLogsWindow } from '@/lib/data/doses'
import { fetchMedicines, fetchSchedules } from '@/lib/data/medicines'
import { fetchNotificationPrefs } from '@/lib/data/prefs'
import { daysUntil } from '@/lib/doses'
import { requireUserOrRedirect } from '@/lib/server/session'

export default async function TodayPage() {
  const { supabase, userId } = await requireUserOrRedirect()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()

  const displayName = profile?.full_name?.trim() || 'there'

  const now = new Date()
  const windowFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const windowTo = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const [medicines, schedules, logs, prefs] = await Promise.all([
    fetchMedicines(supabase, userId),
    fetchSchedules(supabase, userId),
    fetchDoseLogsWindow(supabase, userId, windowFrom, windowTo),
    fetchNotificationPrefs(supabase, userId),
  ])

  const expiringMedicines = prefs.expiry_warnings
    ? medicines
        .filter((medicine) => {
          if (!medicine.expiry_date) return false
          return daysUntil(medicine.expiry_date) <= prefs.expiry_lead_days
        })
        .sort((a, b) => (a.expiry_date ?? '').localeCompare(b.expiry_date ?? ''))
    : []

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10 lg:py-12">
      <p className="text-sm font-medium text-muted-foreground">
        Your medication overview
      </p>
      <h1 className="mt-2 font-serif text-4xl font-normal tracking-tight text-balance sm:text-5xl">
        Good to see you, {displayName}.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        Keep track of your medicines, doses, and important medication
        information in one place.
      </p>

      <div className="mt-10">
        <TodayBoard
          schedules={schedules.filter((schedule) => schedule.active)}
          medicines={medicines}
          logs={logs}
          expiringMedicines={expiringMedicines}
          expiryLeadDays={prefs.expiry_lead_days}
          serverNow={now}
        />
      </div>

      <div className="mt-12 border-l-2 border-brass px-5 py-4">
        <p className="text-sm font-medium">
          Panacea is a medication management tool.
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Medication information is provided for organization and educational
          purposes and does not replace advice from a qualified healthcare
          professional.
        </p>
      </div>
    </div>
  )
}
