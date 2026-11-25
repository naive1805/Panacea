import { ShieldCheck } from 'lucide-react'

import { Container } from '@/components/ui/container'
import { Eyebrow } from '@/components/ui/section-heading'

const guidance = [
  'Follow the directions given by your doctor, pharmacist, or other healthcare professional.',
  'Speak with a healthcare professional before starting, stopping, or changing any medicine.',
  'In an emergency, contact your local emergency services immediately.',
]

export function SafetySection() {
  return (
    <section
      id="safety"
      aria-labelledby="safety-title"
      className="py-20 md:py-28"
    >
      <Container>
        <div className="grid gap-10 rounded-lg border bg-card p-6 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-14">
          <div className="flex flex-col gap-6 lg:col-span-6">
            <Eyebrow>Safety</Eyebrow>
            <span className="flex size-10 items-center justify-center rounded-md border bg-accent text-accent-foreground">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <h2
              id="safety-title"
              className="font-serif text-2xl leading-snug text-balance text-foreground md:text-3xl"
            >
              Panacea provides organizational and informational support and is
              not a substitute for professional medical advice.
            </h2>
          </div>

          <div className="flex flex-col gap-5 lg:col-span-5 lg:col-start-8 lg:justify-end">
            <p className="text-sm font-medium text-foreground">
              Please keep in mind
            </p>
            <ul className="flex flex-col divide-y border-y">
              {guidance.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 py-4 text-sm leading-relaxed text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  )
}
