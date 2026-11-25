import {
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  LayoutGrid,
  Pill,
  Plus,
  ScanBarcode,
  TriangleAlert,
} from 'lucide-react'
import type { ComponentProps, ComponentType, ReactNode } from 'react'

import { BrandMark } from '@/components/brand/wordmark'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type DoseStatus = 'taken' | 'upcoming' | 'scheduled'

type Dose = {
  time: string
  name: string
  strength: string
  instructions: string
  status: DoseStatus
}

// Illustrative content for the marketing preview only.
const todaysDoses: Dose[] = [
  {
    time: '08:00',
    name: 'Metformin',
    strength: '500 mg',
    instructions: '1 tablet with breakfast',
    status: 'taken',
  },
  {
    time: '08:00',
    name: 'Lisinopril',
    strength: '10 mg',
    instructions: '1 tablet',
    status: 'taken',
  },
  {
    time: '13:00',
    name: 'Vitamin D3',
    strength: '1000 IU',
    instructions: '1 capsule with lunch',
    status: 'upcoming',
  },
  {
    time: '21:00',
    name: 'Atorvastatin',
    strength: '20 mg',
    instructions: '1 tablet at bedtime',
    status: 'scheduled',
  },
]

const navItems: { label: string; icon: ComponentType<{ className?: string }> }[] =
  [
    { label: 'Today', icon: LayoutGrid },
    { label: 'Medicines', icon: Pill },
    { label: 'Schedule', icon: CalendarDays },
    { label: 'Reminders', icon: Bell },
    { label: 'Expiry', icon: CalendarClock },
    { label: 'Scan', icon: ScanBarcode },
  ]

const statusBadge: Record<
  DoseStatus,
  { label: string; variant: 'success' | 'accent' | 'neutral' }
> = {
  taken: { label: 'Taken', variant: 'success' },
  upcoming: { label: 'Due next', variant: 'accent' },
  scheduled: { label: 'Scheduled', variant: 'neutral' },
}

export function ProductPreview() {
  const takenCount = todaysDoses.filter((d) => d.status === 'taken').length

  return (
    <figure className="flex flex-col gap-3">
      <div
        inert
        className="overflow-hidden rounded-xl border border-border-strong bg-card shadow-raised"
      >
        <PreviewTopBar />
        <div className="flex">
          <PreviewSidebar />
          <div className="min-w-0 flex-1 bg-background p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">
                  Wednesday, 7 October
                </p>
                <p className="font-serif text-xl text-foreground sm:text-2xl">
                  Good morning, Anna
                </p>
              </div>
              <span className="hidden h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[0.8125rem] font-medium text-primary-foreground sm:inline-flex">
                <Plus className="size-3.5" />
                Add medicine
              </span>
            </div>

            <dl className="mt-5 grid grid-cols-3 divide-x rounded-lg border bg-card">
              <Stat label="Doses today" value={`${takenCount} of ${todaysDoses.length}`}>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(takenCount / todaysDoses.length) * 100}%`,
                    }}
                  />
                </div>
              </Stat>
              <Stat label="Active medicines" value="6" hint="2 as needed" />
              <Stat label="Expiring soon" value="1" hint="Within 5 days" />
            </dl>

            <div className="mt-5 grid gap-5 lg:grid-cols-5">
              <PreviewPanel title="Today's medication" className="lg:col-span-3">
                <ul className="divide-y">
                  {todaysDoses.map((dose) => (
                    <DoseRow key={`${dose.time}-${dose.name}`} dose={dose} />
                  ))}
                </ul>
              </PreviewPanel>

              <div className="flex flex-col gap-5 lg:col-span-2">
                <NextDoseCard />
                <ExpiryCard />
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Illustrative preview of the Panacea dashboard. Medicine names are
        examples only.
      </figcaption>
    </figure>
  )
}

function PreviewTopBar() {
  return (
    <div className="flex h-11 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-2">
        <BrandMark className="size-4" />
        <span className="text-[0.6875rem] font-semibold tracking-[0.22em]">
          PANACEA
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Clock className="size-3.5" />
          10:45
        </span>
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[0.625rem] font-semibold text-muted-foreground">
          AM
        </span>
      </div>
    </div>
  )
}

function PreviewSidebar() {
  return (
    <aside className="hidden w-48 shrink-0 flex-col gap-0.5 border-r bg-sidebar p-3 md:flex">
      {navItems.map(({ label, icon: Icon }, index) => {
        const active = index === 0
        return (
          <span
            key={label}
            className={cn(
              'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[0.8125rem]',
              active
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-muted-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </span>
        )
      })}
    </aside>
  )
}

function Stat({
  label,
  value,
  hint,
  children,
}: {
  label: string
  value: string
  hint?: string
  children?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 p-3 sm:p-4">
      <dt className="truncate text-[0.6875rem] text-muted-foreground sm:text-xs">
        {label}
      </dt>
      <dd className="text-lg font-semibold tabular-nums text-foreground sm:text-xl">
        {value}
      </dd>
      {hint ? (
        <dd className="hidden text-xs text-muted-foreground sm:block">{hint}</dd>
      ) : null}
      {children}
    </div>
  )
}

function PreviewPanel({
  title,
  action,
  className,
  children,
  ...props
}: ComponentProps<'section'> & { title: string; action?: string }) {
  return (
    <section
      className={cn('rounded-lg border bg-card', className)}
      {...props}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-[0.8125rem] font-semibold text-foreground">
          {title}
        </h3>
        {action ? (
          <span className="text-xs text-muted-foreground">{action}</span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function DoseRow({ dose }: { dose: Dose }) {
  const badge = statusBadge[dose.status]
  const taken = dose.status === 'taken'

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="w-11 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
        {dose.time}
      </span>
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-md border',
          taken
            ? 'border-success/20 bg-success-soft text-success'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {taken ? <Check className="size-3.5" /> : <Pill className="size-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-medium text-foreground">
          {dose.name}{' '}
          <span className="font-normal text-muted-foreground">
            {dose.strength}
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {dose.instructions}
        </p>
      </div>
      <Badge variant={badge.variant} dot className="hidden sm:inline-flex">
        {badge.label}
      </Badge>
    </li>
  )
}

function NextDoseCard() {
  return (
    <PreviewPanel title="Upcoming dose" action="in 2 h 15 min">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">
              Vitamin D3
            </p>
            <p className="text-xs text-muted-foreground">
              1000 IU · 1 capsule with lunch
            </p>
          </div>
          <p className="font-serif text-2xl tabular-nums text-primary">13:00</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <span className="inline-flex h-8 items-center justify-center rounded-md bg-primary text-[0.8125rem] font-medium text-primary-foreground">
            Mark as taken
          </span>
          <span className="inline-flex h-8 items-center justify-center rounded-md border border-border-strong text-[0.8125rem] font-medium text-foreground">
            Snooze
          </span>
        </div>
      </div>
    </PreviewPanel>
  )
}

function ExpiryCard() {
  return (
    <PreviewPanel title="Expiry awareness">
      <div className="flex items-start gap-3 p-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-warning/25 bg-warning-soft text-warning">
          <TriangleAlert className="size-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-[0.8125rem] font-medium text-foreground">
            Amoxicillin 250 mg
          </p>
          <p className="text-xs text-muted-foreground">
            Expires 19 Oct 2026
          </p>
          <Badge variant="warning" className="self-start">
            12 days left
          </Badge>
        </div>
      </div>
    </PreviewPanel>
  )
}
