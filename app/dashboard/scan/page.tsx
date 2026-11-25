import { PageHeader } from '@/components/dashboard/page-header'
import { BarcodeRegister } from '@/components/scan/barcode-register'
import { Scanner } from '@/components/scan/scanner'
import { fetchMedicineBarcodes } from '@/lib/data/barcodes'
import { fetchMedicines } from '@/lib/data/medicines'
import { requireUserOrRedirect } from '@/lib/server/session'

export const metadata = { title: 'Scan a barcode' }

export default async function ScanPage() {
  const { supabase, userId } = await requireUserOrRedirect()
  const [barcodes, medicines] = await Promise.all([
    fetchMedicineBarcodes(supabase, userId),
    fetchMedicines(supabase, userId, { includeArchived: true }),
  ])

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10 lg:py-12">
      <PageHeader
        eyebrow="Scan & catalogue"
        title="Medicine barcodes"
        description="Read a pack’s barcode, save it to your register, then assign it to a medicine in your library."
      />

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start">
        <Scanner />
        <BarcodeRegister barcodes={barcodes} medicines={medicines} />
      </div>
    </div>
  )
}
