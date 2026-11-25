-- Panacea — medicine intelligence schema (RxNorm + DailyMed)
-- Run with `supabase db push` or apply directly in the SQL editor.
-- Safe to run after 0001_initial_schema.sql. Nothing is deleted or overwritten.

-- ---------------------------------------------------------------------------
-- allergies — the reader's own allergy list (private, per user)
--
-- Stores the free-text names a person says they are allergic to, so the app
-- can warn when a looked-up medicine's ingredients match. This is health
-- information, so it belongs to exactly one user and no one else can see it.
-- ---------------------------------------------------------------------------
create table if not exists public.allergies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists allergies_user_idx
  on public.allergies (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- medicine_details — a shared, read-only cache of provider data (NOT per user)
--
-- Holds what RxNorm/DailyMed returned for a medicine, keyed by the provider
-- and its own reference id (e.g. an RxNorm RxCUI). It contains only public
-- FDA/NIH label data — never a user id and never anything private — so the
-- whole cache can be shared between users to avoid re-downloading large
-- labels. Each clinical section keeps its source and confidence so the UI can
-- show where a statement came from, or that it is unavailable.
--
-- Ordinary signed-in readers may only READ this table. It is written and
-- refreshed exclusively by trusted server-side code using the Supabase
-- service-role key, which bypasses RLS. No insert/update/delete policy exists
-- for anon or authenticated, so the shared cache cannot be tampered with from
-- the API.
-- ---------------------------------------------------------------------------
create table if not exists public.medicine_details (
  provider text not null
    check (char_length(btrim(provider)) between 1 and 60),
  provider_ref text not null
    check (char_length(btrim(provider_ref)) between 1 and 64),
  setid text,
  name text not null,
  generic_name text,
  brand_name text,
  form text,
  strength text,
  ingredients jsonb not null default '[]'::jsonb,
  ingredients_confidence text not null default 'unavailable'
    check (ingredients_confidence in ('verified', 'educational', 'unavailable')),
  uses jsonb,
  administration jsonb,
  side_effects jsonb,
  warnings jsonb,
  food_guidance jsonb,
  sources jsonb not null default '[]'::jsonb,
  retrieved_at timestamptz not null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  primary key (provider, provider_ref)
);

create index if not exists medicine_details_expires_idx
  on public.medicine_details (expires_at);

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
alter table public.allergies enable row level security;
alter table public.medicine_details enable row level security;

-- allergies: a reader may only ever see and change their own rows.
drop policy if exists "allergies_select_own" on public.allergies;
create policy "allergies_select_own" on public.allergies
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "allergies_insert_own" on public.allergies;
create policy "allergies_insert_own" on public.allergies
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "allergies_update_own" on public.allergies;
create policy "allergies_update_own" on public.allergies
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "allergies_delete_own" on public.allergies;
create policy "allergies_delete_own" on public.allergies
  for delete to authenticated using (auth.uid() = user_id);

-- medicine_details: SHARED and READ-ONLY for readers. There is deliberately
-- no insert/update/delete policy, so no signed-in user (or anonymous visitor)
-- can write to the shared cache through the API. Writes happen only from
-- server-side code holding the service-role key, which bypasses RLS.
drop policy if exists "medicine_details_select_shared" on public.medicine_details;
create policy "medicine_details_select_shared" on public.medicine_details
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- least-privilege grants
--
-- Supabase's default privileges give anon and authenticated broad access to new
-- public tables, so the app relies on RLS for row security above. This block
-- tightens the object privileges themselves as well, so the PostgREST API
-- exposes only what each role needs. The service role is left untouched and so
-- still writes and refreshes the shared medicine cache.
-- ---------------------------------------------------------------------------

-- Anonymous visitors: no access at all to either table.
revoke all on public.medicine_details from anon;
revoke all on public.allergies from anon;

-- Signed-in readers: read-only on the shared cache (RLS also has no write
-- policy, so this is defense in depth). service_role still writes the cache.
revoke insert, update, delete, truncate, references, trigger
  on public.medicine_details from authenticated;
grant select on public.medicine_details to authenticated;

-- Signed-in readers: the four own-row operations on allergies only. Ownership
-- is still enforced by the allergies_*_own RLS policies, not by grants.
revoke truncate, references, trigger on public.allergies from authenticated;
grant select, insert, update, delete on public.allergies to authenticated;
