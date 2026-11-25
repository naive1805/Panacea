'use client'

import { BookOpen, Plus, ScanBarcode, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { BookCard } from '@/components/library/book-card'
import { ButtonLink } from '@/components/ui/button-link'
import { Field, Input, Label } from '@/components/ui/field'
import { daysUntil } from '@/lib/doses'
import type { Medicine, Schedule } from '@/lib/types'
import { cn } from '@/lib/utils'

type FilterKey = 'all' | 'scheduled' | 'expiring' | 'archived'
type SortKey = 'recent' | 'name' | 'expiry'

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Medicines' },
  { key: 'scheduled', label: 'Daily Essentials' },
  { key: 'expiring', label: 'Expiring Soon' },
  { key: 'archived', label: 'Archived' },
]

const sorts: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently added' },
  { key: 'name', label: 'Title' },
  { key: 'expiry', label: 'Expiry' },
]

const RECENT_WINDOW_DAYS = 30

type LibraryViewProps = {
  medicines: Medicine[]
  schedules: Schedule[]
  archivedMedicines: Medicine[]
  /** Days ahead the account is warned about expiry (from notification prefs). */
  expiryLeadDays: number
  /** Whether the account has expiry warnings switched on. */
  expiryWarningsEnabled: boolean
  /** Server render time, so "recently added" is stable across hydration. */
  serverNow: string
}

export function LibraryView({
  medicines,
  schedules,
  archivedMedicines,
  expiryLeadDays,
  expiryWarningsEnabled,
  serverNow,
}: LibraryViewProps) {
  const [query, setQuery] = useState('')
  const [rawFilter, setRawFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('recent')

  // "Expiring soon" only exists while expiry warnings are on.
  const filter =
    rawFilter === 'expiring' && !expiryWarningsEnabled ? 'all' : rawFilter
  const visibleFilters = filters.filter(
    (option) => option.key !== 'expiring' || expiryWarningsEnabled,
  )

  const schedulesByMedicine = useMemo(() => {
    const map = new Map<string, Schedule[]>()
    for (const schedule of schedules) {
      const list = map.get(schedule.medicine_id) ?? []
      list.push(schedule)
      map.set(schedule.medicine_id, list)
    }
    return map
  }, [schedules])

  const scheduledIds = useMemo(() => {
    const ids = new Set<string>()
    for (const schedule of schedules) {
      if (schedule.active) ids.add(schedule.medicine_id)
    }
    return ids
  }, [schedules])

  const collections = useMemo(() => {
    const daily = medicines
      .filter((medicine) => scheduledIds.has(medicine.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8)

    const expiring = expiryWarningsEnabled
      ? medicines
          .filter((medicine) => {
            if (!medicine.expiry_date) return false
            return daysUntil(medicine.expiry_date) <= expiryLeadDays
          })
          .sort((a, b) => (a.expiry_date ?? '').localeCompare(b.expiry_date ?? ''))
          .slice(0, 8)
      : []

    const cutoff =
      new Date(serverNow).getTime() - RECENT_WINDOW_DAYS * 86_400_000
    const recentlyAdded = medicines
      .filter((medicine) => new Date(medicine.created_at).getTime() >= cutoff)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6)

    return { daily, expiring, recentlyAdded }
  }, [expiryLeadDays, expiryWarningsEnabled, medicines, scheduledIds, serverNow])

  const visible = useMemo(() => {
    const source = filter === 'archived' ? archivedMedicines : medicines
    const needle = query.trim().toLowerCase()

    const filtered = source.filter((medicine) => {
      if (needle) {
        const haystack = [
          medicine.name,
          medicine.strength ?? '',
          medicine.instructions ?? '',
          medicine.notes ?? '',
          medicine.barcode ?? '',
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      if (filter === 'scheduled') {
        return scheduledIds.has(medicine.id)
      }
      if (filter === 'expiring') {
        if (!medicine.expiry_date) return false
        return daysUntil(medicine.expiry_date) <= expiryLeadDays
      }
      return true
    })

    const sorted = [...filtered]
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sort === 'expiry') {
      sorted.sort((a, b) => {
        if (!a.expiry_date) return 1
        if (!b.expiry_date) return -1
        return a.expiry_date.localeCompare(b.expiry_date)
      })
    } else {
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return sorted
  }, [
    archivedMedicines,
    expiryLeadDays,
    filter,
    medicines,
    query,
    scheduledIds,
    sort,
  ])

  const isDefaultView = filter === 'all' && !query.trim()
  const scheduleCount = scheduledIds.size

  const schedulesFor = (medicine: Medicine) => schedulesByMedicine.get(medicine.id) ?? []

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
          <Field>
            <Label htmlFor="library-search">Search the library</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="library-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, strength, or note"
                className="pl-9"
              />
            </div>
          </Field>

          <Field>
            <Label htmlFor="library-sort">Order</Label>
            <select
              id="library-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-subtle outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
            >
              {sorts.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div
          role="group"
          aria-label="Filter the library"
          className="flex flex-wrap gap-2"
        >
          {visibleFilters.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRawFilter(option.key)}
              aria-pressed={filter === option.key}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                filter === option.key
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border-strong bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isDefaultView ? (
        <>
          {collections.daily.length > 0 ? (
            <CollectionShelf
              title="Daily Essentials"
              hint="Taken on a schedule"
            >
              {collections.daily.map((medicine) => (
                <BookCard
                  key={medicine.id}
                  medicine={medicine}
                  expiryLeadDays={expiryLeadDays}
                  schedules={schedulesFor(medicine)}
                  className="w-40 shrink-0"
                />
              ))}
            </CollectionShelf>
          ) : null}

          {collections.expiring.length > 0 ? (
            <CollectionShelf
              title="Expiring Soon"
              hint={`Within ${expiryLeadDays} ${
                expiryLeadDays === 1 ? 'day' : 'days'
              }`}
            >
              {collections.expiring.map((medicine) => (
                <BookCard
                  key={medicine.id}
                  medicine={medicine}
                  expiryLeadDays={expiryLeadDays}
                  schedules={schedulesFor(medicine)}
                  className="w-40 shrink-0"
                />
              ))}
            </CollectionShelf>
          ) : null}

          {collections.recentlyAdded.length > 0 ? (
            <CollectionShelf title="Recently Added" hint="New to the shelf">
              {collections.recentlyAdded.map((medicine) => (
                <BookCard
                  key={medicine.id}
                  medicine={medicine}
                  expiryLeadDays={expiryLeadDays}
                  schedules={schedulesFor(medicine)}
                  className="w-40 shrink-0"
                />
              ))}
            </CollectionShelf>
          ) : null}

          <Shelf
            title="All Medicines"
            hint={`${medicines.length} ${
              medicines.length === 1 ? 'volume' : 'volumes'
            } · ${scheduleCount} on a schedule`}
          >
            {medicines.length > 0 ? (
              <BookGrid>
                {visible.map((medicine) => (
                  <BookCard
                    key={medicine.id}
                    medicine={medicine}
                    expiryLeadDays={expiryLeadDays}
                    schedules={schedulesFor(medicine)}
                  />
                ))}
              </BookGrid>
            ) : (
              <EmptyShelf hasQuery={false} />
            )}
          </Shelf>
        </>
      ) : (
        <Shelf
          title={resultTitle(filter, Boolean(query.trim()))}
          hint={`${visible.length} ${
            visible.length === 1 ? 'volume' : 'volumes'
          }`}
        >
          {visible.length > 0 ? (
            <BookGrid>
              {visible.map((medicine) => (
                <BookCard
                  key={medicine.id}
                  medicine={medicine}
                  expiryLeadDays={expiryLeadDays}
                  schedules={schedulesFor(medicine)}
                />
              ))}
            </BookGrid>
          ) : (
            <EmptyShelf hasQuery />
          )}
        </Shelf>
      )}
    </div>
  )
}

function resultTitle(filter: FilterKey, hasQuery: boolean): string {
  if (hasQuery) return 'Search Results'
  if (filter === 'scheduled') return 'Daily Essentials'
  if (filter === 'expiring') return 'Expiring Soon'
  if (filter === 'archived') return 'Archived'
  return 'All Medicines'
}

function Shelf({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-serif text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function CollectionShelf({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <Shelf title={title} hint={hint}>
      <div className="relative -mx-1 px-1">
        <div className="flex snap-x gap-5 overflow-x-auto pb-4 [scrollbar-width:thin]">
          {children}
        </div>
        <div
          aria-hidden="true"
          className="library-shelf-plank absolute inset-x-0 bottom-0 h-2 rounded-full"
        />
      </div>
    </Shelf>
  )
}

function BookGrid({ children }: { children: ReactNode }) {
  return (
    <div className="library-shelf-grid grid grid-cols-2 gap-x-5 gap-y-8 pb-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {children}
    </div>
  )
}

function EmptyShelf({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-card px-8 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-md border border-brass/40 bg-accent text-accent-foreground">
        <BookOpen className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-5 font-serif text-2xl font-normal text-foreground">
        {hasQuery ? 'Nothing on the shelf matches' : 'Your library is empty'}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {hasQuery
          ? 'Try a different search, or clear the filters to see everything you have shelved.'
          : 'Add your first medicine to begin your collection — by hand, or by scanning the barcode on its box.'}
      </p>
      {!hasQuery ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/dashboard/medicines/new">
            <Plus data-icon="inline-start" />
            Add to Library
          </ButtonLink>
          <ButtonLink href="/dashboard/scan" variant="outline">
            <ScanBarcode data-icon="inline-start" />
            Scan a box
          </ButtonLink>
        </div>
      ) : null}
    </div>
  )
}
