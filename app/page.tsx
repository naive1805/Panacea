import { FinalCta } from '@/components/landing/final-cta'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { SafetySection } from '@/components/landing/safety-section'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { TrustSection } from '@/components/landing/trust-section'

export const metadata = { title: 'Home' }

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <TrustSection />
        <HowItWorks />
        <SafetySection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  )
}
