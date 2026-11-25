import { PageHeader } from '@/components/dashboard/page-header'
import { DoseHistory } from '@/components/history/dose-history'
import { Badge } from '@/components/ui/badge'
import { fetchDoseLogHistory } from '@/lib/data/doses'
import { fetchMedicines } from '@/lib/data/medicines'
import { requireUserOrRedirect } from '@/lib/server/session'

export default async function HistoryPage() {
  const { supabase, userId } = await requireUserOrRedirect()

  const [logs, medicines] = await Promise.all([
    fetchDoseLogHistory(supabase, userId, 150),
    fetchMedicines(supabase, userId, { includeArchived: true }),
  ])

  const taken = logs.filter((log) => log.status === 'taken').length
  const skipped = logs.filter((log) => log.status === 'skipped').length
  const missed = logs.filter((log) => log.status === 'missed').length

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 lg:px-10 lg:py-12">
      <PageHeader
        eyebrow="The ledger"
        title="Reading history"
        description="Every dose you have recorded, most recent first."
      />

      <div className="mt-8 flex flex-wrap gap-2">
        <Badge variant="success" dot>
          {taken} taken
        </Badge>
        <Badge variant="neutral" dot>
          {skipped} skipped
        </Badge>
        <Badge variant="danger" dot>
          {missed} missed
        </Badge>
      </div>

      <div className="mt-10">
        <DoseHistory
          logs={logs}
          medicines={medicines}
          grouped
          emptyMessage="Once you start recording doses, your history will collect here."
        />
      </div>
    </div>
  )
}
