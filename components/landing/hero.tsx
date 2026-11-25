import { ArrowRight } from 'lucide-react'

import { ButtonLink } from '@/components/ui/button-link'
import { Container } from '@/components/ui/container'
import { Eyebrow } from '@/components/ui/section-heading'
import { routes } from '@/lib/site-config'

import { ProductPreview } from './product-preview'

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="border-b">
      <Container className="pt-14 pb-12 md:pt-20 md:pb-16 lg:pt-24">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Eyebrow>Medication management</Eyebrow>
            <h1
              id="hero-title"
              className="font-serif text-[2.375rem] leading-[1.08] font-normal tracking-tight text-balance text-foreground sm:text-5xl lg:text-[3.5rem]"
            >
              Medication management, made{' '}
              <em className="text-primary italic">safer</em> and simpler.
            </h1>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-5 lg:pb-2">
            <p className="max-w-md text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
              Keep your medicines, schedules, reminders, and medication
              information organized in one place.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={routes.getStarted} size="lg">
                Get started
                <ArrowRight data-icon="inline-end" />
              </ButtonLink>
              <ButtonLink href="#how-it-works" variant="outline" size="lg">
                See how it works
              </ButtonLink>
            </div>
          </div>
        </div>

        <div id="product" className="mt-12 md:mt-16">
          <ProductPreview />
        </div>
      </Container>
    </section>
  )
}
