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
import type {
  InfoConfidence,
  InfoSource,
  MedicineDetail,
  MedicineIngredient,
  MedicineSection,
} from '@/lib/medicine-provider/types'
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
}: {
  title: string
  icon: ReactNode
  section: MedicineSection
  tone?: 'warning'
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
            This information is not available from the listed sources for this medicine.
            Nothing is guessed.
          </p>
        )}
      </div>
    </section>
  )
}

/**
 * Read-only presentation of a drugdb.in medicine detail. Every value is shown
 * exactly as the source supplied it: fields drugdb.in does not publish
 * (dosage schedules, side effects, food guidance) say so rather than being
 * filled in. Interaction text is quoted from the source, never a safety check.
 */
export function MedicineDetailView({ detail }: { detail: MedicineDetail }) {
  const active = detail.ingredients.filter((item) => item.role === 'active')
  const inactive = detail.ingredients.filter((item) => item.role === 'inactive')
  const hasIngredients =
    detail.ingredientsConfidence !== 'unavailable' && active.length > 0

  return (
    <div className="flex flex-col gap-8">
      <header className="rounded-lg border bg-card p-6 shadow-subtle">
        <p className="text-[0.7rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Medicine reference
        </p>
        <h2 className="mt-2 font-serif text-3xl leading-[1.1] font-normal tracking-tight text-balance text-foreground">
          {detail.name}
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {detail.genericName && detail.genericName !== detail.name ? (
            <Badge variant="neutral">{detail.genericName}</Badge>
          ) : null}
          {detail.brandName ? (
            <Badge variant="accent">{detail.brandName}</Badge>
          ) : null}
          {detail.strength ? (
            <Badge variant="outline">{detail.strength}</Badge>
          ) : null}
          {detail.route ? <Badge variant="outline">{detail.route}</Badge> : null}
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

      <SectionCard
        title="What it is used for"
        icon={<BookOpen className="size-4" />}
        section={detail.uses}
      />
      <SectionCard
        title="Form & how it is taken"
        icon={<Pill className="size-4" />}
        section={detail.administration}
      />
      <SectionCard
        title="Side effects"
        icon={<Activity className="size-4" />}
        section={detail.sideEffects}
      />
      <SectionCard
        title="Do not use / warnings"
        icon={<ShieldAlert className="size-4" />}
        section={detail.warnings}
        tone="warning"
      />
      <SectionCard
        title="Interactions with other drugs"
        icon={<FlaskConical className="size-4" />}
        section={detail.interactions}
        tone="warning"
      />
      <SectionCard
        title="Food & drink"
        icon={<Utensils className="size-4" />}
        section={detail.foodGuidance}
      />

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
