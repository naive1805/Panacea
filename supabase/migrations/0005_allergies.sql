-- Private allergy records used by the medicine library's ingredient prompts.
-- Safe to apply whether or not the equivalent table from 0002 already exists.
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

alter table public.allergies enable row level security;

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

revoke all on public.allergies from anon;
revoke truncate, references, trigger on public.allergies from authenticated;
grant select, insert, update, delete on public.allergies to authenticated;
