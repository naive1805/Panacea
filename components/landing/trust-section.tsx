import { BookOpen, CalendarCheck, CalendarClock, ListChecks } from 'lucide-react'

import { Container } from '@/components/ui/container'
import { SectionHeading } from '@/components/ui/section-heading'

const principles = [
  {
    icon: ListChecks,
    title: 'One organized record',
    description:
      'Keep every medicine you take — name, strength, form, and notes — in a single, structured list.',
  },
  {
    icon: CalendarCheck,
    title: 'Routines you can follow',
    description:
      'Set out when each dose is due so your day has a clear, predictable shape.',
  },
  {
    icon: BookOpen,
    title: 'Information within reach',
    description:
      'Refer back to medication details when you need them, presented plainly and without clutter.',
  },
  {
    icon: CalendarClock,
    title: 'Awareness of expiry',
    description:
      'See which medicines are approaching their expiry date before it becomes a problem.',
  },
]

export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" className="py-20 md:py-28">
      <Container className="flex flex-col gap-12 md:gap-16">
        <div className="grid gap-6 lg:grid-cols-12">
          <SectionHeading
            id="trust-title"
            eyebrow="Designed with care"
            title="A calm, dependable place for your medication routine."
            className="lg:col-span-7"
          />
          <p className="text-base leading-relaxed text-pretty text-muted-foreground md:text-[1.0625rem] lg:col-span-5 lg:self-end">
            Panacea is built to help you organize your medicines and routines,
            and to make medication information easier to access. It supports
            the care you already receive — it does not replace it.
          </p>
        </div>

        <ul className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {principles.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex flex-col gap-4 bg-card p-6 md:p-7">
              <span className="flex size-9 items-center justify-center rounded-md border bg-accent text-accent-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
