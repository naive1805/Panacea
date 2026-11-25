import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/dashboard/page-header'
import { MedicineLookup } from '@/components/intelligence/medicine-lookup'
import { requireUserOrRedirect } from '@/lib/server/session'

export default async function MedicineLookupPage() {
  await requireUserOrRedirect()

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 lg:px-10 lg:py-12">
      <Link
        href="/dashboard/medicines"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Library
      </Link>

      <PageHeader
        className="mt-6"
        eyebrow="Medicine intelligence"
        title="Look up a medicine"
        description="Search India-focused medicine records with NIH RxNorm fallback. Panacea reports food and medicine guidance only when a matching source provides it."
      />

      <div className="mt-10">
        <MedicineLookup />
      </div>
    </div>
  )
}
