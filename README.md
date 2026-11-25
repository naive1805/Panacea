# Panacea

A calm digital medicine library — keep your medicines, schedules, reminders, and
medication information organized in one place. Built with Next.js (App Router),
Tailwind CSS, and Supabase.

## What is here

- **Medicine library** — a bookshelf of your medicines, with add/edit, detail
  pages, spine colours, and archive/restore.
- **Schedules & dose tracking** — reading hours per medicine, a Today board with
  mark-as-taken / snooze / skip, and an undo.
- **History** — every recorded dose, grouped by day.
- **Expiry warnings** — medicines flagged as they approach their expiry date.
- **Reminders** — browser notifications while Panacea is open, with per-account
  preferences. Server-side delivery (email/push) is not configured yet.
- **Barcode scanning** — camera scanning with ZXing and manual entry. Scanned
  codes are saved to a private barcode register and can be assigned to medicines
  in the library. No barcode-to-medicine lookup is guessed automatically.
- **Auth** — Supabase email/password with email confirmation, cookie sessions
  refreshed in `proxy.ts`, and row-level security on every table.

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a Supabase project, then apply the SQL migrations in
   `supabase/migrations/` in filename order (or run `supabase db push`). These
   create the app tables, barcode register, and row-level security policies.

3. Copy the environment file and fill it in:

   ```bash
   cp .env.example .env.local
   ```

4. Run the dev server:

   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command            | What it does                     |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Start the dev server             |
| `pnpm build`       | Production build                 |
| `pnpm start`       | Serve the production build       |
| `pnpm lint`        | ESLint (Next.js + TypeScript)    |
| `pnpm typecheck`   | TypeScript, no emit              |

## Notes

- Panacea is an organizational tool. It does not provide medical advice, and it
  never fabricates medication information or interactions.
- Dose times are wall-clock times read in the device's timezone.

This repository originated from a [v0](https://v0.app) project:
<https://v0.app/chat/projects/prj_Xj66zLC7pVfL4neA2ApG0pN68tX5>
