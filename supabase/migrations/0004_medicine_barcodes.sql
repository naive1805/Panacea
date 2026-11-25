-- Keep scanned package identifiers in their own register so they can be
-- catalogued now and assigned to a medicine later. One medicine may have
-- more than one barcode.
create table if not exists public.medicine_barcodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  barcode text not null check (char_length(btrim(barcode)) between 1 and 128),
  format text,
  medicine_id uuid references public.medicines (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, barcode)
);

create index if not exists medicine_barcodes_user_created_idx
  on public.medicine_barcodes (user_id, created_at desc);

create index if not exists medicine_barcodes_medicine_idx
  on public.medicine_barcodes (medicine_id)
  where medicine_id is not null;

-- Preserve barcodes already saved on medicine records.
insert into public.medicine_barcodes (user_id, barcode, medicine_id)
select user_id, btrim(barcode), id
from public.medicines
where barcode is not null and char_length(btrim(barcode)) between 1 and 128
on conflict (user_id, barcode) do nothing;

alter table public.medicine_barcodes enable row level security;

create policy "medicine_barcodes_select_own" on public.medicine_barcodes
  for select using (auth.uid() = user_id);

create policy "medicine_barcodes_insert_own" on public.medicine_barcodes
  for insert with check (
    auth.uid() = user_id
    and (
      medicine_id is null
      or exists (
        select 1 from public.medicines
        where medicines.id = medicine_barcodes.medicine_id
          and medicines.user_id = auth.uid()
      )
    )
  );

create policy "medicine_barcodes_update_own" on public.medicine_barcodes
  for update using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (
      medicine_id is null
      or exists (
        select 1 from public.medicines
        where medicines.id = medicine_barcodes.medicine_id
          and medicines.user_id = auth.uid()
      )
    )
  );

create policy "medicine_barcodes_delete_own" on public.medicine_barcodes
  for delete using (auth.uid() = user_id);
