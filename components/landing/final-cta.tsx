import { ArrowRight } from 'lucide-react'

import { ButtonLink } from '@/components/ui/button-link'
import { Container } from '@/components/ui/container'
import { routes } from '@/lib/site-config'

export function FinalCta() {
  return (
    <section
      id="get-started"
      aria-labelledby="cta-title"
      className="pb-20 md:pb-28"
    >
      <Container>
        <div className="flex flex-col gap-8 rounded-lg bg-foreground p-8 text-background sm:p-12 md:flex-row md:items-end md:justify-between lg:p-16">
          <div className="flex max-w-xl flex-col gap-4">
            <h2
              id="cta-title"
              className="font-serif text-3xl leading-[1.15] text-balance md:text-4xl"
            >
              Take control of your medication routine.
            </h2>
            <p className="text-base leading-relaxed text-background/70">
              Bring your medicines, schedules, and information together in one
              calm, organized place.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
            <ButtonLink href={routes.getStarted} size="lg">
              Get started
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
            <ButtonLink
              href="#how-it-works"
              size="lg"
              variant="ghost"
              className="text-background hover:bg-background/10 hover:text-background"
            >
              See how it works
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  )
}
