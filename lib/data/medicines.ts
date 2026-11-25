import type { SupabaseClient } from '@supabase/supabase-js'

import type { Medicine, Schedule } from '@/lib/types'
import type { Database } from '@/lib/supabase/database.types'
import { toMedicine, toSchedule } from './mappers'

export type TypedClient = SupabaseClient<Database, 'public'>

export async function fetchMedicines(
  supabase: TypedClient,
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<Medicine[]> {
  let query = supabase
    .from('medicines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!options.includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(toMedicine)
}

export async function fetchMedicine(
  supabase: TypedClient,
  userId: string,
  medicineId: string,
): Promise<Medicine | null> {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .eq('user_id', userId)
    .eq('id', medicineId)
    .maybeSingle()
  if (error) throw error
  return data ? toMedicine(data) : null
}

export async function fetchSchedules(
  supabase: TypedClient,
  userId: string,
): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', userId)
    .order('time', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toSchedule)
}

export async function fetchSchedulesForMedicines(
  supabase: TypedClient,
  userId: string,
  medicineIds: string[],
): Promise<Schedule[]> {
  if (medicineIds.length === 0) return []
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', userId)
    .in('medicine_id', medicineIds)
    .order('time', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toSchedule)
}
