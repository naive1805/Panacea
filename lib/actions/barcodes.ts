'use server'

import { revalidatePath } from 'next/cache'

import { failure, requireUser } from '@/lib/server/session'

export type RegisteredMedicineMatch = {
  id: string
  name: string
  strength: string | null
  form: string
  archived: boolean
}

async function medicineForBarcode(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  userId: string,
  medicineId: string,
): Promise<RegisteredMedicineMatch | null> {
  const { data, error } = await supabase
    .from('medicines')
    .select('id, name, strength, form, archived_at')
    .eq('id', medicineId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? {
    id: data.id,
    name: data.name,
    strength: data.strength,
    form: data.form,
    archived: Boolean(data.archived_at),
  } : null
}

function isBarcodeTableMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  const code = error.code
  return code === '42P01' || code === 'PGRST205'
}

function barcodeSetupFailure(error: unknown): { ok: false; error: string } {
  if (isBarcodeTableMissing(error)) {
    return {
      ok: false,
      error: 'Barcode storage is not set up yet. Apply the Supabase migrations, including 0004_medicine_barcodes.sql.',
    }
  }
  return failure(error)
}

export async function saveScannedBarcode(
  rawBarcode: string,
  format?: string | null,
): Promise<
  | { ok: true; duplicate: boolean; medicine: RegisteredMedicineMatch | null }
  | { ok: false; error: string }
> {
  try {
    const { supabase, userId } = await requireUser()
    const barcode = rawBarcode.trim()
    if (!barcode || barcode.length > 128 || /[\u0000-\u001f]/.test(barcode)) {
      return { ok: false, error: 'That barcode value is not valid.' }
    }

    const { data: existing, error: findError } = await supabase
      .from('medicine_barcodes')
      .select('id, medicine_id')
      .eq('user_id', userId)
      .eq('barcode', barcode)
      .maybeSingle()
    if (findError) throw findError

    if (existing) {
      let medicine = existing.medicine_id
        ? await medicineForBarcode(supabase, userId, existing.medicine_id)
        : null
      if (!medicine) {
        const { data: byBarcode, error: medicineError } = await supabase
          .from('medicines')
          .select('id, name, strength, form, archived_at')
          .eq('user_id', userId)
          .eq('barcode', barcode)
          .limit(1)
          .maybeSingle()
        if (medicineError) throw medicineError
        if (byBarcode) {
          medicine = {
            id: byBarcode.id,
            name: byBarcode.name,
            strength: byBarcode.strength,
            form: byBarcode.form,
            archived: Boolean(byBarcode.archived_at),
          }
          const { error: linkError } = await supabase
            .from('medicine_barcodes')
            .update({ medicine_id: byBarcode.id })
            .eq('id', existing.id)
            .eq('user_id', userId)
          if (linkError) throw linkError
        }
      }
      revalidatePath('/dashboard/scan')
      return { ok: true, duplicate: true, medicine }
    }

    const { data: byBarcode, error: medicineError } = await supabase
      .from('medicines')
      .select('id, name, strength, form, archived_at')
      .eq('user_id', userId)
      .eq('barcode', barcode)
      .limit(1)
      .maybeSingle()
    if (medicineError) throw medicineError

    const cleanFormat = format?.trim().slice(0, 40) || null
    const { error } = await supabase.from('medicine_barcodes').insert({
      user_id: userId,
      barcode,
      format: cleanFormat,
      medicine_id: byBarcode?.id ?? null,
    })
    if (error) {
      // Handle a scan racing with another request for the same barcode.
      if (error.code === '23505') {
        return { ok: true, duplicate: true, medicine: null }
      }
      throw error
    }

    revalidatePath('/dashboard/scan')
    return {
      ok: true,
      duplicate: false,
      medicine: byBarcode ? {
        id: byBarcode.id,
        name: byBarcode.name,
        strength: byBarcode.strength,
        form: byBarcode.form,
        archived: Boolean(byBarcode.archived_at),
      } : null,
    }
  } catch (error) {
    return barcodeSetupFailure(error)
  }
}

export async function assignBarcodeToMedicine(
  barcodeId: string,
  medicineId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser()

    if (!/^[0-9a-f-]{36}$/i.test(barcodeId)) {
      return { ok: false, error: 'That barcode record could not be found.' }
    }

    if (medicineId) {
      const { data: medicine, error: medicineError } = await supabase
        .from('medicines')
        .select('id')
        .eq('id', medicineId)
        .eq('user_id', userId)
        .maybeSingle()
      if (medicineError) throw medicineError
      if (!medicine) {
        return { ok: false, error: 'Choose a medicine from your library.' }
      }
    }

    const { error } = await supabase
      .from('medicine_barcodes')
      .update({ medicine_id: medicineId })
      .eq('id', barcodeId)
      .eq('user_id', userId)
    if (error) throw error

    revalidatePath('/dashboard/scan')
    revalidatePath('/dashboard/medicines')
    return { ok: true }
  } catch (error) {
    return barcodeSetupFailure(error)
  }
}

export async function removeBarcode(barcodeId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const { supabase, userId } = await requireUser()
    if (!/^[0-9a-f-]{36}$/i.test(barcodeId)) {
      return { ok: false, error: 'That barcode record could not be found.' }
    }
    const { error } = await supabase
      .from('medicine_barcodes')
      .delete()
      .eq('id', barcodeId)
      .eq('user_id', userId)
    if (error) throw error
    revalidatePath('/dashboard/scan')
    return { ok: true }
  } catch (error) {
    return barcodeSetupFailure(error)
  }
}
