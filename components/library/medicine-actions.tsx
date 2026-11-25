'use client'

import { Archive, Pencil, RotateCcw, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { archiveMedicine, restoreMedicine } from '@/lib/actions/medicines'
import { logDose } from '@/lib/actions/doses'
import { ButtonLink } from '@/components/ui/button-link'

type MedicineActionsProps = {
  medicineId: string
  archived: boolean
}

export function MedicineActions({ medicineId, archived }: MedicineActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<'archive' | 'restore' | 'dose' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)

  async function handleArchive() {
    setBusy('archive')
    setError(null)
    const result = await archiveMedicine(medicineId)
    setBusy(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setConfirmArchive(false)
    router.refresh()
  }

  async function handleRestore() {
    setBusy('restore')
    setError(null)
    const result = await restoreMedicine(medicineId)
    setBusy(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function handleLogDose() {
    setBusy('dose')
    setError(null)
    const result = await logDose({
      medicineId,
      scheduleId: null,
      scheduledFor: new Date().toISOString(),
      status: 'taken',
    })
    setBusy(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/dashboard/medicines/${medicineId}/edit`} variant="outline" size="sm">
          <Pencil data-icon="inline-start" />
          Edit
        </ButtonLink>

        {archived ? (
          <button
            type="button"
            onClick={handleRestore}
            disabled={busy !== null}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-card px-3 text-[0.8125rem] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" />
            {busy === 'restore' ? 'Restoring…' : 'Restore'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleLogDose}
              disabled={busy !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[0.8125rem] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              {busy === 'dose' ? 'Recording…' : 'Log a dose now'}
            </button>

            {confirmArchive ? (
              <span className="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive-soft px-2 py-1 text-[0.8125rem] text-destructive">
                Move off the shelf?
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={busy !== null}
                  className="font-medium underline underline-offset-2 disabled:opacity-50"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmArchive(false)}
                  className="underline underline-offset-2"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmArchive(true)}
                disabled={busy !== null}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-card px-3 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <Archive className="size-3.5" />
                Archive
              </button>
            )}
          </>
        )}

        <Link
          href="/dashboard/medicines"
          className="inline-flex h-8 items-center rounded-md px-3 text-[0.8125rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to library
        </Link>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
