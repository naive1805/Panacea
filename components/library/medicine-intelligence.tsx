import { Search, TriangleAlert } from 'lucide-react'
import Link from 'next/link'

import { MedicineDetailView } from '@/components/intelligence/medicine-detail'
import { resolveLibraryMedicineDetail } from '@/lib/actions/medicine-info'
import type { Allergy } from '@/lib/types'

type MedicineIntelligenceProps = {
  name: string
  strength: string | null
  providerRef: string | null
  allergies: Allergy[]
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function findAllergyMatches(
  ingredients: Array<{ name: string }>,
  allergies: Allergy[],
): Array<{ allergy: string; ingredient: string }> {
  const matches: Array<{ allergy: string; ingredient: string }> = []
  for (const allergy of allergies) {
    const a = normalize(allergy.name)
    if (!a) continue
    for (const ingredient of ingredients) {
      const b = normalize(ingredient.name)
      if (!b) continue
      if (a.length >= 3 && b.length >= 3 && (a === b || ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `))) {
        matches.push({ allergy: allergy.name, ingredient: ingredient.name })
        break
      }
    }
  }
  return matches
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

  const allergyMatches = findAllergyMatches(detail.ingredients, allergies)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Medicine information · {detail.brandName ?? detail.name}
      </h2>

      {allergyMatches.length > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive-soft p-4"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Possible allergy overlap — ask your pharmacist
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {allergyMatches.map((match) => (
                <li key={`${match.allergy}-${match.ingredient}`} className="text-sm leading-6 text-muted-foreground">
                  Your allergy “{match.allergy}” overlaps “{match.ingredient}”
                  in this medicine.
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Name matching only — not a medical verdict. Do not start or stop
              anything on this hint alone.
            </p>
          </div>
        </div>
      ) : null}

      <MedicineDetailView detail={detail} />
    </section>
  )
}
