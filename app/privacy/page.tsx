import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm text-muted-foreground">Last updated: November 25, 2026</p>
      <h1 className="mt-3 font-serif text-4xl">Privacy notice</h1>
      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <p>Panacea helps you organize medicines, schedules, dose history, allergies, and scanned barcode records. This notice describes the app’s current data flows in general terms; it is not jurisdiction-specific legal advice.</p>
        <section><h2 className="font-medium text-foreground">Information you save</h2><p>Account details and health-related entries you add are stored in the project’s Supabase database. Row-level access rules are intended to limit personal records to the signed-in account. The shared medicine information cache contains provider reference data, not your personal library.</p></section>
        <section><h2 className="font-medium text-foreground">External services</h2><p>Medicine searches and detail requests are sent to configured medicine information providers, including drugdb.in and NIH RxNorm/DailyMed fallback services. Production page-view analytics are provided by Vercel Analytics. Supabase provides authentication and database hosting, and Vercel hosts the site. Their own privacy notices describe their processing.</p></section>
        <section><h2 className="font-medium text-foreground">Camera and notifications</h2><p>Barcode scanning is processed in your browser; decoded barcode values are saved only when you choose to record them. Browser reminders are shown locally while the site is open. Panacea does not currently send scheduled email or push reminders.</p></section>
        <section><h2 className="font-medium text-foreground">Choices and retention</h2><p>You can edit or remove information using available app controls. Database backups or service logs may retain data according to the hosting providers’ policies. Avoid entering information you do not want stored in the account.</p></section>
        <section><h2 className="font-medium text-foreground">Contact</h2><p>No privacy contact address has been published yet.</p></section>
      </div>
    </main>
  )
}
