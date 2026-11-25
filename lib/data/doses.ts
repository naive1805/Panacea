import type { DoseLog } from '@/lib/types'
import { toDoseLog } from './mappers'
import type { TypedClient } from './medicines'

/**
 * Logs inside a window around a reference date. The window is deliberately
 * wider than one day so the server can fetch without knowing the reader's
 * timezone; the client narrows to its own "today".
 */
export async function fetchDoseLogsWindow(
  supabase: TypedClient,
  userId: string,
  from: Date,
  to: Date,
): Promise<DoseLog[]> {
  const { data, error } = await supabase
    .from('dose_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('scheduled_for', from.toISOString())
    .lte('scheduled_for', to.toISOString())
    .order('scheduled_for', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toDoseLog)
}

export async function fetchMedicineDoseLogs(
  supabase: TypedClient,
  userId: string,
  medicineId: string,
  limit = 12,
): Promise<DoseLog[]> {
  const { data, error } = await supabase
    .from('dose_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('medicine_id', medicineId)
    .order('scheduled_for', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(toDoseLog)
}

export async function fetchDoseLogHistory(
  supabase: TypedClient,
  userId: string,
  limit = 120,
): Promise<DoseLog[]> {
  const { data, error } = await supabase
    .from('dose_logs')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_for', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(toDoseLog)
}
