'use server'

import { revalidatePath } from 'next/cache'

import { SNOOZE_MINUTES } from '@/lib/constants'
import { toDoseLog } from '@/lib/data/mappers'
import type { DoseLog, DoseStatus } from '@/lib/types'
import { failure, requireUser } from '@/lib/server/session'

export type LogDoseInput = {
  medicineId: string
  scheduleId?: string | null
  /** ISO timestamp of the scheduled slot, computed in the reader's timezone. */
  scheduledFor: string
  status: Exclude<DoseStatus, 'missed'>
}

export async function logDose(
  input: LogDoseInput,
): Promise<{ ok: true; data: DoseLog } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser()

    if (!input.medicineId) {
      return { ok: false, error: 'That medicine could not be found.' }
    }
    if (Number.isNaN(Date.parse(input.scheduledFor))) {
      return { ok: false, error: 'That dose time is not valid.' }
    }

    const now = new Date()
    const row = {
      user_id: userId,
      medicine_id: input.medicineId,
      schedule_id: input.scheduleId ?? null,
      scheduled_for: new Date(input.scheduledFor).toISOString(),
      status: input.status,
      taken_at: input.status === 'taken' ? now.toISOString() : null,
      snoozed_until:
        input.status === 'snoozed'
          ? new Date(now.getTime() + SNOOZE_MINUTES * 60_000).toISOString()
          : null,
    }

    const { data, error } = await supabase
      .from('dose_logs')
      .upsert(row, { onConflict: 'schedule_id,scheduled_for' })
      .select('*')
      .single()
    if (error) throw error

    revalidatePath('/dashboard', 'layout')
    return { ok: true, data: toDoseLog(data) }
  } catch (error) {
    return failure(error)
  }
}

export async function undoDoseLog(
  logId: string,
): Promise<{ ok: true; data: null } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser()

    const { error } = await supabase
      .from('dose_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId)
    if (error) throw error

    revalidatePath('/dashboard', 'layout')
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}
