'use client'

import { Check, CircleDashed, Link2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  assignBarcodeToMedicine,
  removeBarcode,
} from '@/lib/actions/barcodes'
import type { MedicineBarcodeRow } from '@/lib/data/barcodes'
import type { Medicine } from '@/lib/types'

type BarcodeRegisterProps = {
  barcodes: MedicineBarcodeRow[]
  medicines: Medicine[]
}

export function BarcodeRegister({ barcodes, medicines }: BarcodeRegisterProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const unassignedCount = barcodes.filter((item) => !item.medicine_id).length
  const visible = barcodes.filter((item) =>
    filter === 'all'
      ? true
      : filter === 'unassigned'
        ? !item.medicine_id
        : Boolean(item.medicine_id),
  )

  async function assign(id: string, medicineId: string) {
    setBusyId(id)
    setError(null)
    const result = await assignBarcodeToMedicine(id, medicineId || null)
    if (!result.ok) setError(result.error)
    else startTransition(() => router.refresh())
    setBusyId(null)
  }

  async function remove(id: string) {
    setBusyId(id)
    setError(null)
    const result = await removeBarcode(id)
    if (!result.ok) setError(result.error)
    else startTransition(() => router.refresh())
    setBusyId(null)
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card">
      <div className="flex flex-col gap-4 border-b border-border/70 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Your saved codes</p>
          <h2 className="mt-2 font-serif text-2xl font-normal tracking-tight">Barcode register</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {barcodes.length} {barcodes.length === 1 ? 'barcode' : 'barcodes'} saved
            {unassignedCount > 0 ? ` · ${unassignedCount} need${unassignedCount === 1 ? 's' : ''} a medicine` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1" aria-label="Filter barcodes">
          {([
            ['all', `All ${barcodes.length}`],
            ['unassigned', `Needs a medicine ${unassignedCount}`],
            ['assigned', `Assigned ${barcodes.length - unassignedCount}`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${filter === key ? 'bg-card text-foreground shadow-subtle' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="border-b border-destructive/20 bg-destructive/5 px-5 py-3 text-sm text-destructive">{error}</p>
      ) : null}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
            {filter === 'unassigned' ? <Check className="size-5" /> : <CircleDashed className="size-5" />}
          </span>
          <h3 className="mt-4 font-serif text-lg font-normal">
            {barcodes.length === 0 ? 'No barcodes saved yet' : filter === 'unassigned' ? 'All caught up' : 'No assigned barcodes'}
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            {barcodes.length === 0
              ? 'Scan a medicine pack or enter its number above. Each code will appear here until you assign it.'
              : filter === 'unassigned'
                ? 'Every saved barcode is linked to a medicine in your library.'
                : 'Choose a medicine for a saved code and it will show up here.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/70">
          {visible.map((item) => {
            const busy = busyId === item.id || isPending
            return (
              <li key={item.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-sm font-medium tabular-nums text-foreground">{item.barcode}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.format && item.format !== 'MANUAL' ? item.format.replaceAll('_', ' ') : item.format === 'MANUAL' ? 'Entered manually' : 'Barcode'}
                    {' · '}
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(item.created_at))}
                  </p>
                </div>

                {item.medicine_id ? (
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground lg:w-64">
                    <Link2 className="size-4 shrink-0 text-primary" />
                    <span className="truncate text-foreground">{item.medicine_name ?? 'Medicine in your library'}</span>
                    {item.medicine_strength ? <span className="shrink-0 text-xs">{item.medicine_strength}</span> : null}
                  </span>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`medicine-${item.id}`}>Assign a medicine to barcode {item.barcode}</label>
                  <select
                    id={`medicine-${item.id}`}
                    value={item.medicine_id ?? ''}
                    disabled={busy || medicines.length === 0}
                    onChange={(event) => void assign(item.id, event.target.value)}
                    className="h-9 min-w-48 max-w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-60"
                  >
                    <option value="">{medicines.length === 0 ? 'Add a medicine first' : 'Choose a medicine…'}</option>
                    {medicines.map((medicine) => (
                      <option key={medicine.id} value={medicine.id}>
                        {medicine.name}{medicine.strength ? ` · ${medicine.strength}` : ''}{medicine.archived_at ? ' · Archived' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    disabled={busy}
                    aria-label={`Remove barcode ${item.barcode}`}
                    title="Remove barcode"
                    className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
