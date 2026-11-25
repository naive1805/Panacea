'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

import { createAllergy, deleteAllergy } from '@/lib/actions/allergies'
import { Button } from '@/components/ui/button'
import { Field, Input, Label } from '@/components/ui/field'
import type { Allergy } from '@/lib/types'

export function AllergyPanel({
  initialAllergies,
  loadError = false,
}: {
  initialAllergies: Allergy[]
  loadError?: boolean
}) {
  const router = useRouter()
  const [allergies, setAllergies] = useState(initialAllergies)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setMessage(null)
    const result = await createAllergy({ name })
    if (result.ok) {
      setAllergies((current) => [...current, result.data])
      setName('')
      router.refresh()
    } else {
      setMessage(result.error)
    }
    setBusy(false)
  }

  async function remove(allergy: Allergy) {
    if (busy) return
    setBusy(true)
    setMessage(null)
    const result = await deleteAllergy(allergy.id)
    if (result.ok) {
      setAllergies((current) => current.filter((item) => item.id !== allergy.id))
      router.refresh()
    } else {
      setMessage(result.error)
    }
    setBusy(false)
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Allergies
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Your private list is compared with listed ingredients when available.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        {loadError ? (
          <p className="text-sm leading-6 text-destructive">
            Allergy records could not be loaded. Check that migration 0002_medicine_intelligence.sql or 0005_allergies.sql has been applied, then refresh this page.
          </p>
        ) : allergies.length > 0 ? (
          <ul className="mb-4 flex flex-col divide-y">
            {allergies.map((allergy) => (
              <li key={allergy.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{allergy.name}</span>
                  {allergy.note ? <span className="mt-0.5 block text-xs text-muted-foreground">{allergy.note}</span> : null}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${allergy.name} from allergies`}
                  disabled={busy}
                  onClick={() => void remove(allergy)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm leading-6 text-muted-foreground">
            No allergies saved. Add any known allergies to see ingredient overlap prompts here.
          </p>
        )}

        {!loadError ? (
          <form onSubmit={(event) => void add(event)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field className="flex-1">
              <Label htmlFor="allergy-name">Add an allergy</Label>
              <Input
                id="allergy-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                placeholder="e.g. penicillin"
                autoComplete="off"
              />
            </Field>
            <Button type="submit" variant="outline" disabled={busy || !name.trim()}>
              <Plus className="size-4" aria-hidden="true" />
              Add
            </Button>
          </form>
        ) : null}
        {message ? <p role="alert" className="mt-2 text-xs text-destructive">{message}</p> : null}
      </div>
    </section>
  )
}
