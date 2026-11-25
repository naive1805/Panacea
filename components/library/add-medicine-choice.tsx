import { ArrowRight, Keyboard, ScanBarcode } from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

type ChoicePanelProps = {
  href: string
  spine: string
  icon: ReactNode
  title: string
  description: string
  detail: string
  cta: string
}

function ChoicePanel({
  href,
  spine,
  icon,
  title,
  description,
  detail,
  cta,
}: ChoicePanelProps) {
  return (
    <Link
      href={href}
      className="book-cover group relative flex flex-col overflow-hidden rounded-lg border border-border-strong py-7 pr-6 pl-8 shadow-subtle outline-none transition-all duration-200 hover:-translate-y-1 hover:shadow-raised focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <span
        aria-hidden="true"
        className="book-spine absolute inset-y-0 left-0 w-3"
        style={{ '--spine': spine } as CSSProperties}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
      />

      <span className="relative flex size-11 items-center justify-center rounded-md border border-brass/40 bg-accent text-accent-foreground">
        {icon}
      </span>

      <h2 className="relative mt-5 font-serif text-2xl font-normal tracking-tight text-foreground">
        {title}
      </h2>
      <p className="relative mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      <p className="relative mt-4 border-t border-border/70 pt-4 text-xs leading-5 text-muted-foreground">
        {detail}
      </p>

      <span className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        {cta}
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  )
}

/**
 * The first decision when adding a medicine: read a barcode, or write the
 * entry in yourself. Both paths end at the same form, which stays fully
 * usable when scanning is unavailable.
 */
export function AddMedicineChoice() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <ChoicePanel
        href="/dashboard/scan"
        spine="#2f6f66"
        icon={<ScanBarcode className="size-5" aria-hidden="true" />}
        title="Scan a medicine"
        description="Point your camera at the barcode on the pack. If a code can be read, its number is carried into the entry form."
        detail="Scanning depends on your browser. The number can always be typed by hand instead."
        cta="Open the scanner"
      />
      <ChoicePanel
        href="/dashboard/medicines/new?mode=manual"
        spine="#a4553b"
        icon={<Keyboard className="size-5" aria-hidden="true" />}
        title="Enter it manually"
        description="Write what is on the box — name, strength, form, expiry, and your own directions. Nothing is guessed for you."
        detail="Works everywhere, no camera or barcode needed."
        cta="Start a blank entry"
      />
    </div>
  )
}
