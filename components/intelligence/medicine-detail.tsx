import {
  Activity,
  BookOpen,
  ExternalLink,
  Factory,
  Pill,
  ShieldAlert,
  Utensils,
  FlaskConical,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { findAllergyMatches } from '@/lib/allergies/matching'
import type { Allergy } from '@/lib/types'
import type {
  InfoConfidence,
  InfoSource,
  MedicineDetail,
  MedicineIngredient,
  MedicineSection,
} from '@/lib/medicine-provider/types'
import { displayMedicineName, isMultiItemPack } from '@/lib/medicine-provider/presentation'
import { cn } from '@/lib/utils'

const CONFIDENCE_META: Record<
  InfoConfidence,
  { label: string; variant: 'success' | 'warning' | 'neutral' }
> = {
  verified: { label: 'Verified source data', variant: 'success' },
  educational: { label: 'General guidance', variant: 'warning' },
  unavailable: { label: 'Not available', variant: 'neutral' },
}

function ConfidenceBadge({ confidence }: { confidence: InfoConfidence }) {
  const meta = CONFIDENCE_META[confidence]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

function formatRetrieved(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function SourceLink({ source }: { source: InfoSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 transition-colors hover:underline"
    >
      {source.label}
      <ExternalLink className="size-3" aria-hidden="true" />
    </a>
  )
}

function IngredientGroup({
  label,
  items,
}: {
  label: string
  items: MedicineIngredient[]
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={`${item.name}-${index}`}
            className="flex items-baseline justify-between gap-4 text-sm"
          >
            <span className="text-foreground">{item.name}</span>
            {item.strength ? (
              <span className="text-right tabular-nums text-muted-foreground">
                {item.strength}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SectionCard({
  title,
  icon,
  section,
  tone,
  emptyMessage,
}: {
  title: string
  icon: ReactNode
  section: MedicineSection
  tone?: 'warning'
  emptyMessage?: string
}) {
  const hasText = section.confidence !== 'unavailable' && Boolean(section.text)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2.5 font-serif text-xl font-normal tracking-tight text-foreground">
          <span aria-hidden="true" className="text-muted-foreground">
            {icon}
          </span>
          {title}
        </h3>
        <ConfidenceBadge confidence={section.confidence} />
      </div>
      <div
        className={cn(
          'rounded-lg border bg-card p-5',
          tone === 'warning' && 'border-warning/30 bg-warning-soft',
        )}
      >
        {hasText ? (
          <>
            <p className="text-sm leading-7 whitespace-pre-wrap text-foreground">
              {section.text}
            </p>
            {section.source ? <SourceLink source={section.source} /> : null}
          </>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            {emptyMessage ?? 'This information is not available from the listed sources for this medicine. Nothing is guessed.'}
          </p>
        )}
      </div>
    </section>
  )
}

function RelatedProductCard({
  detail,
  allergies,
}: {
  detail: MedicineDetail
  allergies: Allergy[]
}) {
  const active = detail.ingredients.filter((item) => item.role === 'active')
  const matches = findAllergyMatches(detail.ingredients, allergies)
  const sections = [
    ['Uses', detail.uses],
    ['Warnings', detail.warnings],
    ['Interactions', detail.interactions],
    ['Food & drink', detail.foodGuidance],
    ['Side effects', detail.sideEffects],
  ] as const
  const available = sections.filter(([, section]) => section.confidence !== 'unavailable' && section.text)
  const hasFoodGuidance = detail.foodGuidance.confidence !== 'unavailable' && Boolean(detail.foodGuidance.text)

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-5">
      <div>
        <h4 className="break-words font-serif text-xl text-foreground [overflow-wrap:anywhere]">
          {displayMedicineName(detail.name)}
        </h4>
        {detail.form || detail.strength ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {[detail.strength, detail.form].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>

      {active.length > 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Active ingredients: {active.map((item) => item.name).join(', ')}
        </p>
      ) : null}

      {matches.length > 0 ? (
        <p role="alert" className="rounded-md border border-destructive/25 bg-destructive-soft p-3 text-sm leading-6 text-foreground">
          Possible allergy overlap: {matches.map((match) => `${match.allergy} / ${match.ingredient}`).join('; ')}. Confirm with a pharmacist.
        </p>
      ) : null}

      {available.length > 0 ? (
        <dl className="flex flex-col gap-3">
          {available.map(([label, section]) => (
            <div key={label} className="border-t pt-3 first:border-0 first:pt-0">
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{section.text}</dd>
              {section.source ? <SourceLink source={section.source} /> : null}
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          No matching product-label guidance was available for this related record.
        </p>
      )}
      {!hasFoodGuidance ? (
        <p className="text-xs leading-5 text-muted-foreground">
          No food-specific statement was found for this product; check its own leaflet for food and drink instructions.
        </p>
      ) : null}

      {detail.sources.length > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t pt-3">
          {detail.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline-offset-4 hover:underline">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

/**
 * Read-only presentation of provider data. Values stay attached to their
 * sources; missing information is called out rather than filled in.
 */
export function MedicineDetailView({
  detail,
  allergies = [],
  allergyLoadError = false,
}: {
  detail: MedicineDetail
  allergies?: Allergy[]
  allergyLoadError?: boolean
}) {
  const active = detail.ingredients.filter((item) => item.role === 'active')
  const inactive = detail.ingredients.filter((item) => item.role === 'inactive')
  const hasIngredients =
    detail.ingredientsConfidence !== 'unavailable' && active.length > 0
  const medicineName = displayMedicineName(detail.name)
  const isPack = isMultiItemPack(detail.name)
  const allergyMatches = findAllergyMatches(detail.ingredients, allergies)
  const sections = [
    { title: 'What it is used for', icon: <BookOpen className="size-4" />, section: detail.uses },
    { title: 'Form & how it is taken', icon: <Pill className="size-4" />, section: detail.administration },
    { title: 'Side effects', icon: <Activity className="size-4" />, section: detail.sideEffects },
    { title: 'Do not use / warnings', icon: <ShieldAlert className="size-4" />, section: detail.warnings, tone: 'warning' as const },
    { title: 'Interactions with other drugs', icon: <FlaskConical className="size-4" />, section: detail.interactions, tone: 'warning' as const },
    { title: 'Food & drink', icon: <Utensils className="size-4" />, section: detail.foodGuidance },
  ]
  const medicineSections = sections.filter(({ title }) => title !== 'Food & drink')
  const availableSections = medicineSections.filter(({ section }) => section.confidence !== 'unavailable' && section.text)
  const unavailableSections = medicineSections.filter(({ section }) => section.confidence === 'unavailable' || !section.text)

  return (
    <div className="flex flex-col gap-8">
      <header className="rounded-lg border bg-card p-6 shadow-subtle">
        <p className="text-[0.7rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Medicine reference
        </p>
        <h2 className="mt-2 break-words font-serif text-3xl leading-[1.1] font-normal tracking-tight text-balance text-foreground [overflow-wrap:anywhere]">
          {medicineName}
        </h2>

        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          {isPack ? <Badge variant="warning">Multi-item pack</Badge> : null}
          {detail.genericName && detail.genericName !== detail.name ? (
            <Badge variant="neutral" className="max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">{detail.genericName}</Badge>
          ) : null}
          {detail.brandName && displayMedicineName(detail.brandName) !== medicineName ? (
            <Badge variant="accent" className="max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">{displayMedicineName(detail.brandName)}</Badge>
          ) : null}
          {!isPack && detail.strength ? (
            <Badge variant="outline">{detail.strength}</Badge>
          ) : null}
          {!isPack && detail.route ? <Badge variant="outline">{detail.route}</Badge> : null}
        </div>

        {detail.manufacturer ? (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Factory className="size-3.5" aria-hidden="true" />
            {detail.manufacturer}
            {detail.licenseStatus ? ` · Licence: ${detail.licenseStatus}` : null}
          </p>
        ) : null}

        <p className="mt-5 text-xs text-muted-foreground">
          Retrieved {formatRetrieved(detail.retrievedAt)} · Reference{' '}
          <span className="tabular-nums">{detail.providerRef}</span>
        </p>
      </header>

      {isPack ? (
        <div className="rounded-lg border border-warning/30 bg-warning-soft px-5 py-4 text-sm leading-6 text-foreground">
          This reference describes a pack containing multiple products. The listed sources did not provide a matching label for the whole pack, so some medicine-specific guidance is unavailable. Check the individual products and confirm instructions with a pharmacist.
        </div>
      ) : null}

      <section
        aria-label="Allergy ingredient comparison"
        className={cn(
          'rounded-lg border px-5 py-4',
          allergyMatches.length > 0
            ? 'border-destructive/25 bg-destructive-soft'
            : allergyLoadError
              ? 'border-warning/30 bg-warning-soft'
              : 'border-border bg-card',
        )}
      >
        <h3 className="text-sm font-medium text-foreground">
          {allergyMatches.length > 0 ? 'Possible allergy overlap' : 'Allergy check'}
        </h3>
        {allergyLoadError ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Saved allergies could not be loaded, so this medicine was not compared against your list.
          </p>
        ) : allergyMatches.length > 0 ? (
          <>
            <ul className="mt-2 flex flex-col gap-1">
              {allergyMatches.map((match) => (
                <li key={`${match.allergy}-${match.ingredient}`} className="text-sm leading-6 text-foreground">
                  Your saved allergy “{match.allergy}” matches listed ingredient “{match.ingredient}”.
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Name matching only; this is not a medical safety verdict. Confirm with a pharmacist or clinician.
            </p>
          </>
        ) : allergies.length === 0 ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            No saved allergies are available to compare with this medicine.
          </p>
        ) : detail.ingredientsConfidence === 'unavailable' ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            The ingredient list is unavailable, so your saved allergies could not be checked against this medicine.
          </p>
        ) : (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            No name match was found in the listed active ingredients. This does not rule out an allergy or reaction.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2.5 font-serif text-xl font-normal tracking-tight text-foreground">
            <span aria-hidden="true" className="text-muted-foreground">
              <Pill className="size-4" />
            </span>
            Ingredients
          </h3>
          <ConfidenceBadge confidence={detail.ingredientsConfidence} />
        </div>
        {hasIngredients ? (
          <div className="flex flex-col gap-5 rounded-lg border bg-card p-5">
            <IngredientGroup label="Active" items={active} />
            <IngredientGroup label="Other ingredients" items={inactive} />
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-5">
            <p className="text-sm leading-6 text-muted-foreground">
              Ingredient information was not available from the source for this
              medicine.
            </p>
          </div>
        )}
      </section>

      {isPack && (detail.components?.length ?? 0) > 0 ? (
        <section className="flex flex-col gap-4">
          <div>
            <h3 className="font-serif text-2xl text-foreground">Related single-product records</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              RxNorm links these product records to the pack. Their labels are shown separately when ingredient matching succeeds; verify the physical package before using this information.
            </p>
          </div>
          {detail.components?.map((component) => (
            <RelatedProductCard key={component.providerRef} detail={component} allergies={allergies} />
          ))}
        </section>
      ) : null}

      {availableSections.map((item) => (
        <SectionCard key={item.title} {...item} />
      ))}
      <SectionCard
        title="Food & drink"
        icon={<Utensils className="size-4" />}
        section={detail.foodGuidance}
        emptyMessage="No food-specific statement was found in the available labels. This does not confirm there are no food or drink restrictions; check the package leaflet or ask a pharmacist."
      />
      {unavailableSections.length > 0 ? (
        <details className="rounded-lg border bg-card px-5 py-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Information not available from these sources ({unavailableSections.length})
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Nothing is guessed. Check the product leaflet or ask a pharmacist for these details.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {unavailableSections.map(({ title }) => (
              <li key={title}><Badge variant="neutral">{title}</Badge></li>
            ))}
          </ul>
        </details>
      ) : null}

      <section className="rounded-lg border border-dashed border-border-strong bg-surface p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 size-5 shrink-0 text-warning"
            aria-hidden="true"
          />
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Not a safety check
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Information above is quoted from the listed sources when they
              publish it. Panacea does not check whether your medicines are
              safe to take together, and this page never tells you a
              combination is safe. Ask a pharmacist or doctor.
            </p>
          </div>
        </div>
      </section>

      {detail.sources.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Sources
          </h3>
          <ul className="flex flex-col gap-2">
            {detail.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 transition-colors hover:underline"
                >
                  {source.label}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
