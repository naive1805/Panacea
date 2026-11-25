'use client'

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Loader2,
  Search,
  SearchX,
  TriangleAlert,
} from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'

import { MedicineDetailView } from '@/components/intelligence/medicine-detail'
import { Button } from '@/components/ui/button'
import { Field, Input, Label } from '@/components/ui/field'
import { getMedicineDetail, searchMedicines } from '@/lib/actions/medicine-info'
import type {
  MedicineDetail,
  MedicineSearchResult,
} from '@/lib/medicine-provider/types'
import { displayMedicineName, isMultiItemPack } from '@/lib/medicine-provider/presentation'

type SearchState =
  | { phase: 'idle' }
  | { phase: 'searching' }
  | { phase: 'results'; query: string; results: MedicineSearchResult[] }
  | { phase: 'empty'; query: string }
  | { phase: 'error'; message: string }

type DetailState =
  | { phase: 'idle' }
  | { phase: 'loading'; name: string }
  | { phase: 'loaded'; detail: MedicineDetail }
  | { phase: 'error'; name: string; message: string }

const TERM_TYPE_LABELS: Record<string, string> = {
  medicine: 'Branded medicine',
  generic: 'Generic (salt)',
  substance: 'Substance (salt)',
  SBD: 'Branded medicine',
  SBDC: 'Branded medicine',
  SBDF: 'Branded medicine',
  BN: 'Brand name',
  SCD: 'Generic medicine',
  SCDC: 'Generic medicine',
  SCDF: 'Generic medicine',
  IN: 'Active ingredient',
  MIN: 'Active ingredient',
}

function describeTermType(termType: string): string | null {
  return TERM_TYPE_LABELS[termType] ?? null
}

/**
 * Medicine search against drugdb.in (Common Drug Codes for India / NRCeS).
 * Results carry no health advice until a record is opened; the detail view
 * only displays what the source supplies — dosage schedules, side effects
 * and food guidance are reported as unavailable, never invented.
 */
export function MedicineLookup() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<SearchState>({ phase: 'idle' })
  const [detail, setDetail] = useState<DetailState>({ phase: 'idle' })

  const searchSeq = useRef(0)
  const detailSeq = useRef(0)

  async function runSearch(term: string) {
    const seq = ++searchSeq.current
    detailSeq.current += 1
    setDetail({ phase: 'idle' })
    setSearch({ phase: 'searching' })

    try {
      const result = await searchMedicines(term)
      if (seq !== searchSeq.current) return

      if (!result.ok) {
        setSearch({ phase: 'error', message: result.message })
        return
      }
      if (result.data.length === 0) {
        setSearch({ phase: 'empty', query: term })
        return
      }
      setSearch({ phase: 'results', query: term, results: result.data })
    } catch {
      if (seq !== searchSeq.current) return
      setSearch({
        phase: 'error',
        message: 'The medicine service could not be reached. Please try again.',
      })
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    void runSearch(term)
  }

  async function openDetail(result: MedicineSearchResult) {
    const seq = ++detailSeq.current
    setDetail({ phase: 'loading', name: result.name })

    try {
      const response = await getMedicineDetail(result.providerRef)
      if (seq !== detailSeq.current) return

      if (!response.ok) {
        setDetail({ phase: 'error', name: result.name, message: response.message })
        return
      }
      setDetail({ phase: 'loaded', detail: response.data })
    } catch {
      if (seq !== detailSeq.current) return
      setDetail({
        phase: 'error',
        name: result.name,
        message: 'The medicine service could not be reached. Please try again.',
      })
    }
  }

  function backToResults() {
    detailSeq.current += 1
    setDetail({ phase: 'idle' })
  }

  const busy = search.phase === 'searching'

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <Field className="flex-1">
          <Label htmlFor="medicine-lookup-search">Search by name</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="medicine-lookup-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. metformin"
              className="pl-9"
            />
          </div>
        </Field>
        <Button type="submit" disabled={busy || !query.trim()} className="sm:w-40">
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="size-4" aria-hidden="true" />
          )}
          {busy ? 'Searching' : 'Search'}
        </Button>
      </form>

      <div aria-busy={busy}>
        {detail.phase === 'idle' ? (
          <SearchResults state={search} onSelect={openDetail} />
        ) : (
          <DetailPanel
            state={detail}
            onBack={backToResults}
            onRetryQuery={() => {
              const term = query.trim()
              if (term) void runSearch(term)
            }}
          />
        )}
      </div>
    </div>
  )
}

function SearchResults({
  state,
  onSelect,
}: {
  state: SearchState
  onSelect: (result: MedicineSearchResult) => void
}) {
  if (state.phase === 'idle') {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-card px-8 py-14 text-center">
        <span className="flex size-11 items-center justify-center rounded-md border border-brass/40 bg-accent text-accent-foreground">
          <BookOpen className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 font-serif text-2xl font-normal text-foreground">
          Look a medicine up
        </p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Search drugdb.in’s India-focused medicine records, with NIH RxNorm
          as a fallback. Panacea shows food guidance only when a matching
          published label provides it; it never invents advice.
        </p>
      </div>
    )
  }

  if (state.phase === 'searching') {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-8 py-14 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Searching…
      </p>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="flex flex-col items-center rounded-lg border border-destructive/20 bg-destructive-soft px-8 py-14 text-center">
        <span className="flex size-11 items-center justify-center rounded-md border border-destructive/30 bg-card text-destructive">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 font-serif text-2xl font-normal text-foreground">
          The lookup could not run
        </p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          {state.message}
        </p>
      </div>
    )
  }

  if (state.phase === 'empty') {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-card px-8 py-14 text-center">
        <span className="flex size-11 items-center justify-center rounded-md border border-border-strong bg-muted text-muted-foreground">
          <SearchX className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 font-serif text-2xl font-normal text-foreground">
          No matches found
        </p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Nothing matched “{state.query}”. Check the spelling, or try the
          generic (ingredient) name instead of the brand.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {state.results.length}{' '}
        {state.results.length === 1 ? 'match' : 'matches'} for “{state.query}”
      </p>
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {state.results.map((result) => {
          const label = describeTermType(result.termType)
          return (
            <li key={result.providerRef}>
              <button
                type="button"
                onClick={() => onSelect(result)}
                className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-serif text-lg text-foreground">
                    {result.name}
                  </span>
                  {label ? (
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {label}
                    </span>
                  ) : null}
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DetailPanel({
  state,
  onBack,
  onRetryQuery,
}: {
  state: DetailState
  onBack: () => void
  onRetryQuery: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2 self-start"
      >
        <ArrowLeft data-icon="inline-start" />
        Back to results
      </Button>

      {state.phase === 'loading' ? (
        <p
          role="status"
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-8 py-14 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading {state.name}…
        </p>
      ) : null}

      {state.phase === 'error' ? (
        <div className="flex flex-col items-center rounded-lg border border-destructive/20 bg-destructive-soft px-8 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-md border border-destructive/30 bg-card text-destructive">
            <TriangleAlert className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-5 font-serif text-2xl font-normal text-foreground">
            No detail for {state.name}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {state.message}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetryQuery}
            className="mt-6"
          >
            Try the search again
          </Button>
        </div>
      ) : null}

      {state.phase === 'loaded' ? (
        <>
          <ShelveButton detail={state.detail} />
          <MedicineDetailView detail={state.detail} />
        </>
      ) : null}
    </div>
  )
}

function ShelveButton({ detail }: { detail: MedicineDetail }) {
  const isPack = isMultiItemPack(detail.name)
  const params = new URLSearchParams()
  const displayName = displayMedicineName(detail.brandName ?? detail.name)
  params.set('name', displayName)
  if (!isPack && detail.strength) params.set('strength', detail.strength)
  if (!isPack && detail.form) params.set('form', detail.form)
  params.set('from', 'lookup')
  params.set('providerRef', detail.providerRef)

  if (isPack) {
    return (
      <p className="max-w-2xl rounded-lg border border-warning/30 bg-warning-soft px-5 py-4 text-sm leading-6 text-foreground">
        This pack can’t be added as one scheduled medicine. Search for each product separately and add it as its own medicine.
      </p>
    )
  }

  return (
    <a
      href={`/dashboard/medicines/new?${params.toString()}`}
      className="inline-flex min-h-10 max-w-full items-center justify-start gap-1.5 self-start rounded-md bg-primary px-5 py-2 text-left text-sm font-medium text-primary-foreground shadow-subtle transition-colors hover:bg-primary/90"
    >
      <BookOpen className="size-4 shrink-0" aria-hidden="true" />
      <span className="line-clamp-2 min-w-0 break-words">Shelve “{displayName}”</span>
    </a>
  )
}
