import { Container } from '@/components/ui/container'
import { SectionHeading } from '@/components/ui/section-heading'

const steps = [
  {
    number: '01',
    title: 'Add your medicines',
    description:
      'Record each medicine with its strength, form, and any notes from your prescriber or pharmacist.',
  },
  {
    number: '02',
    title: 'Manage your schedule',
    description:
      'Set when each dose is due. Panacea lays out your day so you can see what is taken and what comes next.',
  },
  {
    number: '03',
    title: 'Stay informed',
    description:
      'Look up medication information and keep an eye on expiry dates, all from the same place.',
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="border-y bg-surface py-20 md:py-28"
    >
      <Container className="flex flex-col gap-12 md:gap-16">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="Three steps to an organized routine."
          description="Set up once, then return whenever you need a clear view of your day."
        />

        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step) => (
            <li key={step.number} className="flex flex-col gap-4 border-t border-border-strong pt-6">
              <span className="font-serif text-3xl leading-none text-primary tabular-nums">
                {step.number}
              </span>
              <h3 className="text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
