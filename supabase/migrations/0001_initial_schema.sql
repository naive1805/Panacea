-- Panacea — initial schema
-- Run with `supabase db push` or apply directly in the SQL editor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Populate a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- medicines — the library
-- ---------------------------------------------------------------------------
create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  strength text,
  form text not null default 'other',
  color text not null default 'teal',
  instructions text,
  notes text,
  expiry_date date,
  barcode text,
  source text not null default 'manual'
    check (source in ('manual', 'barcode', 'provider')),
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists medicines_user_idx
  on public.medicines (user_id, created_at desc);

create index if not exists medicines_expiry_idx
  on public.medicines (user_id, expiry_date);

drop trigger if exists medicines_updated_at on public.medicines;
create trigger medicines_updated_at
  before update on public.medicines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- schedules — when a dose is due (wall-clock time in the reader's timezone)
-- ---------------------------------------------------------------------------
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medicine_id uuid not null references public.medicines (id) on delete cascade,
  time time not null,
  weekdays smallint[] not null default array[0, 1, 2, 3, 4, 5, 6]::smallint[],
  dose_label text,
  active boolean not null default true,
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_weekdays_valid
    check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
);

create index if not exists schedules_user_idx on public.schedules (user_id);
create index if not exists schedules_medicine_idx on public.schedules (medicine_id);

drop trigger if exists schedules_updated_at on public.schedules;
create trigger schedules_updated_at
  before update on public.schedules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dose_logs — what actually happened (history)
-- ---------------------------------------------------------------------------
create table if not exists public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medicine_id uuid not null references public.medicines (id) on delete cascade,
  schedule_id uuid references public.schedules (id) on delete set null,
  scheduled_for timestamptz not null,
  status text not null check (status in ('taken', 'skipped', 'snoozed', 'missed')),
  taken_at timestamptz,
  snoozed_until timestamptz,
  note text,
  created_at timestamptz not null default now()
);

-- One row per scheduled slot: repeated actions update the same log. Plain
-- unique index (Postgres treats NULLs as distinct), so unscheduled logs are
-- unaffected and PostgREST can upsert on the column pair directly.
create unique index if not exists dose_logs_slot_idx
  on public.dose_logs (schedule_id, scheduled_for);

create index if not exists dose_logs_user_idx
  on public.dose_logs (user_id, scheduled_for desc);

create index if not exists dose_logs_medicine_idx
  on public.dose_logs (medicine_id, scheduled_for desc);

-- ---------------------------------------------------------------------------
-- notification_prefs
-- ---------------------------------------------------------------------------
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dose_reminders boolean not null default true,
  expiry_warnings boolean not null default true,
  expiry_lead_days integer not null default 5
    check (expiry_lead_days between 1 and 365),
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_prefs_updated_at on public.notification_prefs;
create trigger notification_prefs_updated_at
  before update on public.notification_prefs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- push_subscriptions — stored so server-side delivery can be added later
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.medicines enable row level security;
alter table public.schedules enable row level security;
alter table public.dose_logs enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "medicines_select_own" on public.medicines;
create policy "medicines_select_own" on public.medicines
  for select using (auth.uid() = user_id);

drop policy if exists "medicines_insert_own" on public.medicines;
create policy "medicines_insert_own" on public.medicines
  for insert with check (auth.uid() = user_id);

drop policy if exists "medicines_update_own" on public.medicines;
create policy "medicines_update_own" on public.medicines
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "medicines_delete_own" on public.medicines;
create policy "medicines_delete_own" on public.medicines
  for delete using (auth.uid() = user_id);

drop policy if exists "schedules_select_own" on public.schedules;
create policy "schedules_select_own" on public.schedules
  for select using (auth.uid() = user_id);

drop policy if exists "schedules_insert_own" on public.schedules;
create policy "schedules_insert_own" on public.schedules
  for insert with check (auth.uid() = user_id);

drop policy if exists "schedules_update_own" on public.schedules;
create policy "schedules_update_own" on public.schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "schedules_delete_own" on public.schedules;
create policy "schedules_delete_own" on public.schedules
  for delete using (auth.uid() = user_id);

drop policy if exists "dose_logs_select_own" on public.dose_logs;
create policy "dose_logs_select_own" on public.dose_logs
  for select using (auth.uid() = user_id);

drop policy if exists "dose_logs_insert_own" on public.dose_logs;
create policy "dose_logs_insert_own" on public.dose_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "dose_logs_update_own" on public.dose_logs;
create policy "dose_logs_update_own" on public.dose_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "dose_logs_delete_own" on public.dose_logs;
create policy "dose_logs_delete_own" on public.dose_logs
  for delete using (auth.uid() = user_id);

drop policy if exists "notification_prefs_select_own" on public.notification_prefs;
create policy "notification_prefs_select_own" on public.notification_prefs
  for select using (auth.uid() = user_id);

drop policy if exists "notification_prefs_insert_own" on public.notification_prefs;
create policy "notification_prefs_insert_own" on public.notification_prefs
  for insert with check (auth.uid() = user_id);

drop policy if exists "notification_prefs_update_own" on public.notification_prefs;
create policy "notification_prefs_update_own" on public.notification_prefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
