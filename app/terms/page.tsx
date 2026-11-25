import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms' }

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm text-muted-foreground">Last updated: November 25, 2026</p>
      <h1 className="mt-3 font-serif text-4xl">Terms of use</h1>
      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <p>Panacea is an organizational and educational tool for managing a personal medication routine. These general terms are informational and are not tailored to a particular jurisdiction.</p>
        <section><h2 className="font-medium text-foreground">Not medical advice</h2><p>Panacea does not diagnose, prescribe, or recommend treatment. Medicine records, interaction information, allergy matches, and reminders can be incomplete or inaccurate. Confirm decisions and instructions with a qualified healthcare professional or pharmacist.</p></section>
        <section><h2 className="font-medium text-foreground">Your account and entries</h2><p>Keep your sign-in credentials private and enter accurate information. You are responsible for reviewing your medicines, schedules, and dose records. Do not rely on the app as an emergency service or as the sole reminder for a dose.</p></section>
        <section><h2 className="font-medium text-foreground">Availability and external information</h2><p>The app and external medicine information services may be unavailable or change without notice. Provider information is displayed for reference and may not apply to your location or product.</p></section>
        <section><h2 className="font-medium text-foreground">Acceptable use</h2><p>Use the service lawfully and do not interfere with its operation or attempt to access another person’s account or information.</p></section>
        <section><h2 className="font-medium text-foreground">Changes</h2><p>These terms may be updated as the app changes. Continued use after a revision means you have had the opportunity to review the updated text.</p></section>
      </div>
    </main>
  )
}
