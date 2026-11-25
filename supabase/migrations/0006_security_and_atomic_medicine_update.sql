-- Harden child-row ownership checks and make medicine/schedule edits atomic.
drop policy if exists "schedules_insert_own" on public.schedules;
create policy "schedules_insert_own" on public.schedules for insert
  with check (auth.uid() = user_id and exists (
    select 1 from public.medicines m where m.id = medicine_id and m.user_id = auth.uid()
  ));
drop policy if exists "schedules_update_own" on public.schedules;
create policy "schedules_update_own" on public.schedules for update
  using (auth.uid() = user_id and exists (
    select 1 from public.medicines m where m.id = medicine_id and m.user_id = auth.uid()
  ))
  with check (auth.uid() = user_id and exists (
    select 1 from public.medicines m where m.id = medicine_id and m.user_id = auth.uid()
  ));

drop policy if exists "dose_logs_insert_own" on public.dose_logs;
create policy "dose_logs_insert_own" on public.dose_logs for insert
  with check (auth.uid() = user_id and exists (
    select 1 from public.medicines m where m.id = medicine_id and m.user_id = auth.uid()
  ) and (schedule_id is null or exists (
    select 1 from public.schedules s where s.id = schedule_id
      and s.medicine_id = dose_logs.medicine_id and s.user_id = auth.uid()
  )));
drop policy if exists "dose_logs_update_own" on public.dose_logs;
create policy "dose_logs_update_own" on public.dose_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (
    select 1 from public.medicines m where m.id = medicine_id and m.user_id = auth.uid()
  ) and (schedule_id is null or exists (
    select 1 from public.schedules s where s.id = schedule_id
      and s.medicine_id = dose_logs.medicine_id and s.user_id = auth.uid()
  )));

create or replace function public.update_medicine_with_schedules(
  p_medicine_id uuid,
  p_medicine jsonb,
  p_schedules jsonb
)
returns setof public.medicines
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_schedule jsonb;
  v_updated public.medicines;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  update public.medicines m set
    name = p_medicine->>'name',
    strength = p_medicine->>'strength',
    form = p_medicine->>'form',
    color = p_medicine->>'color',
    instructions = p_medicine->>'instructions',
    notes = p_medicine->>'notes',
    expiry_date = nullif(p_medicine->>'expiry_date', '')::date,
    barcode = p_medicine->>'barcode',
    provider_ref = case when p_medicine ? 'provider_ref' then p_medicine->>'provider_ref' else m.provider_ref end,
    source = case when p_medicine->>'source' = 'provider' then 'provider' else m.source end
  where m.id = p_medicine_id and m.user_id = v_user_id
  returning m.* into v_updated;
  if not found then raise exception 'Medicine not found'; end if;

  delete from public.schedules s where s.medicine_id = p_medicine_id and s.user_id = v_user_id
    and not exists (select 1 from jsonb_array_elements(coalesce(p_schedules, '[]'::jsonb)) item
      where item->>'id' = s.id::text);

  for v_schedule in select value from jsonb_array_elements(coalesce(p_schedules, '[]'::jsonb)) loop
    if v_schedule ? 'id' then
      update public.schedules s set time = (v_schedule->>'time')::time,
        dose_label = v_schedule->>'dose_label', weekdays = array(
          select jsonb_array_elements_text(v_schedule->'weekdays')::smallint
        ), active = true
      where s.id = (v_schedule->>'id')::uuid and s.medicine_id = p_medicine_id and s.user_id = v_user_id;
      if not found then raise exception 'Schedule not found for this medicine'; end if;
    else
      insert into public.schedules (user_id, medicine_id, time, dose_label, weekdays)
      values (v_user_id, p_medicine_id, (v_schedule->>'time')::time,
        v_schedule->>'dose_label', array(
          select jsonb_array_elements_text(v_schedule->'weekdays')::smallint
        ));
    end if;
  end loop;
  return next v_updated;
end;
$$;

revoke all on function public.update_medicine_with_schedules(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.update_medicine_with_schedules(uuid, jsonb, jsonb) to authenticated;
