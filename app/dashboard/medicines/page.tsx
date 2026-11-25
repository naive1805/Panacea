import { Plus, ScanBarcode, Search } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { LibraryView } from '@/components/library/library-view'
import { ButtonLink } from '@/components/ui/button-link'
import { fetchMedicines, fetchSchedules } from '@/lib/data/medicines'
import { fetchNotificationPrefs } from '@/lib/data/prefs'
import { requireUserOrRedirect } from '@/lib/server/session'

export const metadata = { title: 'Medicine library' }

export default async function LibraryPage() {
  const { supabase, userId } = await requireUserOrRedirect()

  const [medicines, archived, schedules, prefs] = await Promise.all([
    fetchMedicines(supabase, userId),
    fetchMedicines(supabase, userId, { includeArchived: true }).then((all) =>
      all.filter((medicine) => medicine.archived_at),
    ),
    fetchSchedules(supabase, userId),
    fetchNotificationPrefs(supabase, userId),
  ])

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10 lg:py-12">
      <PageHeader
        eyebrow="Your collection"
        title="Your Medicine Library"
        description="Every medicine you take, shelved together — searchable, sorted, and never lost."
        actions={
          <>
            <ButtonLink href="/dashboard/medicines/new">
              <Plus data-icon="inline-start" />
              Add to Library
            </ButtonLink>
            <ButtonLink href="/dashboard/medicines/lookup" variant="outline">
              <Search data-icon="inline-start" />
              Look up a medicine
            </ButtonLink>
            <ButtonLink href="/dashboard/scan" variant="outline">
              <ScanBarcode data-icon="inline-start" />
              Scan a box
            </ButtonLink>
          </>
        }
      />

      <div className="mt-10">
        <LibraryView
          medicines={medicines}
          schedules={schedules}
          archivedMedicines={archived}
          expiryLeadDays={prefs.expiry_lead_days}
          expiryWarningsEnabled={prefs.expiry_warnings}
          serverNow={new Date().toISOString()}
        />
      </div>
    </div>
  )
}
