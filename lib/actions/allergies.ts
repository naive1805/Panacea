'use server'

import { revalidatePath } from 'next/cache'

import { failure, requireUser } from '@/lib/server/session'
import type { Allergy } from '@/lib/types'
import { normalizeAllergyDraft } from '@/lib/validate'

/**
 * Personal allergy CRUD. Every call runs as the signed-in reader through the
 * ordinary authenticated client, so the `allergies_*_own` RLS policies limit
 * each person to their own rows. Allergy data is never written to the shared
 * medicine cache.
 */

export type AllergyInput = { name: string; note?: string }

type AllergyResult =
  | { ok: true; data: Allergy }
  | { ok: false; error: string }

function isDuplicate(error: { code?: string }): boolean {
  return error.code === '23505'
}

export async function createAllergy(input: AllergyInput): Promise<AllergyResult> {
  try {
    const { supabase, userId } = await requireUser()

    const normalized = normalizeAllergyDraft(input)
    if (!normalized.ok) return { ok: false, error: normalized.error }

    const { data, error } = await supabase
      .from('allergies')
      .insert({ ...normalized.value, user_id: userId })
      .select('*')
      .single()
    if (error) {
      if (isDuplicate(error)) {
        return { ok: false, error: 'That allergy is already on your list.' }
      }
      throw error
    }

    revalidatePath('/dashboard', 'layout')
    return { ok: true, data }
  } catch (error) {
    return failure(error)
  }
}

export async function updateAllergy(
  allergyId: string,
  input: AllergyInput,
): Promise<AllergyResult> {
  try {
    const { supabase, userId } = await requireUser()

    const normalized = normalizeAllergyDraft(input)
    if (!normalized.ok) return { ok: false, error: normalized.error }

    const { data, error } = await supabase
      .from('allergies')
      .update(normalized.value)
      .eq('id', allergyId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle()
    if (error) {
      if (isDuplicate(error)) {
        return { ok: false, error: 'That allergy is already on your list.' }
      }
      throw error
    }
    if (!data) {
      return { ok: false, error: 'That allergy could not be found.' }
    }

    revalidatePath('/dashboard', 'layout')
    return { ok: true, data }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteAllergy(
  allergyId: string,
): Promise<{ ok: true; data: null } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser()

    const { error } = await supabase
      .from('allergies')
      .delete()
      .eq('id', allergyId)
      .eq('user_id', userId)
    if (error) throw error

    revalidatePath('/dashboard', 'layout')
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}
