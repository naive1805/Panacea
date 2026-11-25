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
  if (/^(medicine|generic|substance):\d+$/.test(trimmed)) return trimmed
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
        source: providerRef ? 'provider' : (medicine.value as { source?: string }).source ?? 'manual',
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
    const { supabase, userId } = await requireUser()

    const medicine = normalizeMedicineDraft(input.medicine)
    if (!medicine.ok) return { ok: false, error: medicine.error }

    const schedules = normalizeScheduleDrafts(input.schedules ?? [])
    if (!schedules.ok) return { ok: false, error: schedules.error }

    const updateValue = { ...medicine.value }
    // Only overwrite linkage when the form carried one (lookup flow);
    // ordinary edits keep the existing provider_ref.
    if (input.providerRef !== undefined) {
      const providerRef = normalizeProviderRef(input.providerRef)
      Object.assign(updateValue, {
        provider_ref: providerRef,
        ...(providerRef ? { source: 'provider' } : {}),
      })
    }

    const { data: updated, error } = await supabase
      .from('medicines')
      .update(updateValue as unknown as never)
      .eq('id', medicineId)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) throw error

    const { data: existing, error: existingError } = await supabase
      .from('schedules')
      .select('id')
      .eq('user_id', userId)
      .eq('medicine_id', medicineId)
    if (existingError) throw existingError

    const existingIds = new Set((existing ?? []).map((row) => row.id))
    const keptIds = new Set(
      schedules.value.map((s) => s.id).filter((id): id is string => Boolean(id)),
    )
    const removedIds = [...existingIds].filter((id) => !keptIds.has(id))

    if (removedIds.length > 0) {
      const { error: removeError } = await supabase
        .from('schedules')
        .delete()
        .in('id', removedIds)
        .eq('user_id', userId)
      if (removeError) throw removeError
    }

    for (const schedule of schedules.value) {
      if (schedule.id && existingIds.has(schedule.id)) {
        const { error: scheduleError } = await supabase
          .from('schedules')
          .update({
            time: schedule.time,
            dose_label: schedule.dose_label,
            weekdays: schedule.weekdays,
            active: true,
          })
          .eq('id', schedule.id)
          .eq('user_id', userId)
        if (scheduleError) throw scheduleError
      } else {
        const { error: scheduleError } = await supabase.from('schedules').insert({
          user_id: userId,
          medicine_id: medicineId,
          time: schedule.time,
          dose_label: schedule.dose_label,
          weekdays: schedule.weekdays,
        })
        if (scheduleError) throw scheduleError
      }
    }

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
