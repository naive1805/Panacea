import { Search } from 'lucide-react'
import Link from 'next/link'

import { MedicineDetailView } from '@/components/intelligence/medicine-detail'
import { resolveLibraryMedicineDetail } from '@/lib/actions/medicine-info'
import { displayMedicineName } from '@/lib/medicine-provider/presentation'
import type { Allergy } from '@/lib/types'

type MedicineIntelligenceProps = {
  name: string
  strength: string | null
  providerRef: string | null
  allergies: Allergy[]
  allergyLoadError?: boolean
}

/**
 * Recognizes a library medicine in available sources and renders its record in the
 * empty reading space of the library detail page.
 *
 * - Hand-typed medicines are matched by name (+ strength tie-break); shelved
 *   lookup results load by their stored `provider_ref`.
 * - Shows salt composition, manufacturer, uses, form/route, warnings,
 *   interactions — and honest "not in drugdb.in" states for dosage, side
 *   effects and food guidance, which the source does not publish.
 * - Cross-checks the reader's own allergy list against the active
 *   ingredients and warns on a match. This is a prompt to ask a pharmacist,
 *   never a safety verdict.
 * - Never fails the page: no match or a down service renders a quiet
 *   lookup hint instead.
 */
export async function MedicineIntelligence({
  name,
  strength,
  providerRef,
  allergies,
  allergyLoadError = false,
}: MedicineIntelligenceProps) {
  const detail = await resolveLibraryMedicineDetail({ name, strength, providerRef })

  if (!detail) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Medicine information
        </h2>
        <div className="rounded-lg border border-dashed border-border-strong bg-card px-5 py-6 text-center">
          <p className="text-sm leading-6 text-muted-foreground">
            No medicine information record matched “{name}” yet. Check the spelling, or
            look it up by brand or salt name.
          </p>
          <Link
            href="/dashboard/medicines/lookup"
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Search className="size-4" aria-hidden="true" />
            Look up this medicine
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Medicine information · {displayMedicineName(detail.brandName ?? detail.name)}
      </h2>
      <MedicineDetailView detail={detail} allergies={allergies} allergyLoadError={allergyLoadError} />
    </section>
  )
}
