'use server'

import { revalidatePath } from 'next/cache'

import { toMedicine } from '@/lib/data/mappers'
import type { Medicine, MedicineDraft, ScheduleDraft } from '@/lib/types'
import { failure, requireUser } from '@/lib/server/session'
import { normalizeMedicineDraft, normalizeScheduleDrafts } from '@/lib/validate'

type MedicineInput = {
  medicine: MedicineDraft
  schedules: ScheduleDraft[]
  providerRef?: string
}

function normalizeProviderRef(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  // drugdb.in refs (`medicine:…`); bare numeric SCTIDs treated as medicines.
  if (/^(medicine|generic|substance|rxnorm):\d+$/.test(trimmed)) return trimmed
  if (/^\d+$/.test(trimmed)) return `medicine:${trimmed}`
  return null
}

export async function createMedicine(
  input: MedicineInput,
): Promise<{ ok: true; data: Medicine } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser()

    const medicine = normalizeMedicineDraft(input.medicine)
    if (!medicine.ok) return { ok: false, error: medicine.error }

    const schedules = normalizeScheduleDrafts(input.schedules ?? [])
    if (!schedules.ok) return { ok: false, error: schedules.error }

    const providerRef = normalizeProviderRef(input.providerRef)

    const { data: created, error } = await supabase
      .from('medicines')
      .insert({
        ...medicine.value,
        user_id: userId,
        source: providerRef ? 'provider' : 'manual',
        provider_ref: providerRef,
      })
      .select('*')
      .single()
    if (error) throw error

    if (schedules.value.length > 0) {
      const rows = schedules.value.map((schedule) => ({
        user_id: userId,
        medicine_id: created.id,
        time: schedule.time,
        dose_label: schedule.dose_label,
        weekdays: schedule.weekdays,
      }))
      const { error: scheduleError } = await supabase.from('schedules').insert(rows)
      if (scheduleError) throw scheduleError
    }

    revalidatePath('/dashboard', 'layout')
    return { ok: true, data: toMedicine(created) }
  } catch (error) {
    return failure(error)
  }
}

export async function updateMedicine(
  medicineId: string,
  input: MedicineInput,
): Promise<{ ok: true; data: Medicine } | { ok: false; error: string }> {
  try {
    const { supabase } = await requireUser()

    const medicine = normalizeMedicineDraft(input.medicine)
    if (!medicine.ok) return { ok: false, error: medicine.error }

    const schedules = normalizeScheduleDrafts(input.schedules ?? [])
    if (!schedules.ok) return { ok: false, error: schedules.error }

    const providerRef = input.providerRef === undefined
      ? undefined
      : normalizeProviderRef(input.providerRef)
    const medicinePayload = {
      ...medicine.value,
      ...(providerRef !== undefined ? { provider_ref: providerRef, ...(providerRef ? { source: 'provider' } : {}) } : {}),
    }
    const { data, error } = await supabase.rpc('update_medicine_with_schedules', {
      p_medicine_id: medicineId,
      p_medicine: medicinePayload,
      p_schedules: schedules.value,
    })
    if (error) throw error
    const updated = data?.[0]
    if (!updated) throw new Error('Medicine not found.')

    revalidatePath('/dashboard', 'layout')
    return { ok: true, data: toMedicine(updated) }
  } catch (error) {
    return failure(error)
  }
}

export async function archiveMedicine(
  medicineId: string,
): Promise<{ ok: true; data: null } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser()

    const { error } = await supabase
      .from('medicines')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', medicineId)
      .eq('user_id', userId)
    if (error) throw error

    const { error: scheduleError } = await supabase
      .from('schedules')
      .update({ active: false })
      .eq('medicine_id', medicineId)
      .eq('user_id', userId)
    if (scheduleError) throw scheduleError

    revalidatePath('/dashboard', 'layout')
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}

export async function restoreMedicine(
  medicineId: string,
): Promise<{ ok: true; data: null } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser()

    const { error } = await supabase
      .from('medicines')
      .update({ archived_at: null })
      .eq('id', medicineId)
      .eq('user_id', userId)
    if (error) throw error

    const { error: scheduleError } = await supabase
      .from('schedules')
      .update({ active: true })
      .eq('medicine_id', medicineId)
      .eq('user_id', userId)
    if (scheduleError) throw scheduleError

    revalidatePath('/dashboard', 'layout')
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}
