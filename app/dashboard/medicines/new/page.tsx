import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/dashboard/page-header'
import { AddMedicineChoice } from '@/components/library/add-medicine-choice'
import { MedicineForm } from '@/components/library/medicine-form'
import type { MedicineDraft, MedicineForm as MedicineFormValue, ScheduleDraft } from '@/lib/types'

type NewMedicinePageProps = {
  searchParams?: Promise<{
    barcode?: string
    name?: string
    strength?: string
    form?: string
    from?: string
    mode?: string
    providerRef?: string
  }>
}

const VALID_FORMS = new Set([
  'tablet',
  'capsule',
  'liquid',
  'cream',
  'drops',
  'inhaler',
  'injection',
  'patch',
  'other',
])

export default async function NewMedicinePage({ searchParams }: NewMedicinePageProps) {
  const params = await searchParams

  const prefill: MedicineDraft = {
    name: params?.name?.slice(0, 160) ?? '',
    strength: params?.strength?.slice(0, 80) ?? '',
    form: (params?.form && VALID_FORMS.has(params.form)
      ? params.form
      : 'tablet') as MedicineFormValue,
    color: 'teal',
    instructions: '',
    notes: '',
    expiry_date: '',
    barcode: params?.barcode?.slice(0, 64) ?? '',
  }

  const schedules: ScheduleDraft[] = []

  const showForm = Boolean(
    params?.mode === 'manual' ||
      params?.from === 'scan' ||
      params?.from === 'lookup' ||
      params?.name ||
      params?.strength ||
      params?.barcode,
  )

  if (!showForm) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-10 lg:px-10 lg:py-12">
        <PageHeader
          eyebrow="Add to the library"
          title="How would you like to add it?"
          description="Two ways in — read the pack, or write the entry yourself. Both end at the same shelf."
        />
        <div className="mt-10">
          <AddMedicineChoice />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10 lg:py-12">
      <Link
        href="/dashboard/medicines"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Library
      </Link>

      <PageHeader
        className="mt-6"
        eyebrow="Add to the shelf"
        title="A new volume"
        description="Enter what is on the box. Panacea records only what you type — it never invents directions or interactions."
      />

      {params?.from === 'scan' && params.barcode ? (
        <p className="mt-8 rounded-md border border-warning/25 bg-warning-soft px-4 py-3 text-sm leading-6 text-warning">
          Barcode <span className="font-medium tabular-nums">{params.barcode}</span>{' '}
          is saved with this medicine. It could not be matched to a medicine
          record, so nothing was guessed — finish the entry by hand.
        </p>
      ) : null}

      {params?.from === 'lookup' ? (
        <p className="mt-8 rounded-md border border-success/25 bg-success-soft px-4 py-3 text-sm leading-6 text-success">
          Details below are prefilled from drugdb.in. Check them against your
          pack before shelving — strengths and brands with similar names exist.
        </p>
      ) : null}

      <div className="mt-10">
        <MedicineForm
          initial={{ medicine: prefill, schedules }}
          providerRef={params?.providerRef?.slice(0, 80)}
        />
      </div>
    </div>
  )
}
