import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/dashboard/page-header'
import { MedicineForm } from '@/components/library/medicine-form'
import { fetchMedicine, fetchSchedulesForMedicines } from '@/lib/data/medicines'
import { requireUserOrRedirect } from '@/lib/server/session'
import { medicineDraftFrom } from '@/lib/validate'

type EditMedicinePageProps = {
  params: Promise<{ id: string }>
}

export const metadata = { title: 'Edit medicine' }

export default async function EditMedicinePage({ params }: EditMedicinePageProps) {
  const { id } = await params
  const { supabase, userId } = await requireUserOrRedirect()

  const [medicine, schedules] = await Promise.all([
    fetchMedicine(supabase, userId, id),
    fetchSchedulesForMedicines(supabase, userId, [id]),
  ])

  if (!medicine) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10 lg:py-12">
      <PageHeader
        eyebrow="Edit volume"
        title={medicine.name}
        description="Correct a detail, change the reading hours, or move it off the shelf."
      />

      <div className="mt-10">
        <MedicineForm
          medicineId={medicine.id}
          initial={{
            medicine: medicineDraftFrom(medicine),
            schedules: schedules.map((schedule) => ({
              id: schedule.id,
              time: schedule.time.slice(0, 5),
              dose_label: schedule.dose_label ?? '',
              weekdays: schedule.weekdays,
            })),
          }}
        />
      </div>
    </div>
  )
}
