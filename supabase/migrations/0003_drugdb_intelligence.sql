-- Panacea — drugdb.in (HealthPilot DIS) medicine intelligence columns
-- Run with `supabase db push` or apply directly in the SQL editor.
-- Safe to run after 0002_medicine_intelligence.sql. Nothing is deleted.
--
-- drugdb.in supplies brand manufacturer, licence status, route of
-- administration and drug-interaction text, which the RxNorm/DailyMed cache
-- had no columns for. Existing rows keep working: new columns are nullable
-- and read back as `unavailable` sections when absent.

alter table if exists public.medicine_details
  add column if not exists manufacturer text,
  add column if not exists license_status text,
  add column if not exists route text,
  add column if not exists interactions jsonb;
