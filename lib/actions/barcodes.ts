'use server'

import { revalidatePath } from 'next/cache'

import { failure, requireUser } from '@/lib/server/session'

export async function saveScannedBarcode(
  rawBarcode: string,
  format?: string | null,
): Promise<
  | { ok: true; duplicate: boolean }
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
      .select('id')
      .eq('user_id', userId)
      .eq('barcode', barcode)
      .maybeSingle()
    if (findError) throw findError

    if (existing) {
      revalidatePath('/dashboard/scan')
      return { ok: true, duplicate: true }
    }

    const cleanFormat = format?.trim().slice(0, 40) || null
    const { error } = await supabase.from('medicine_barcodes').insert({
      user_id: userId,
      barcode,
      format: cleanFormat,
    })
    if (error) {
      // Handle a scan racing with another request for the same barcode.
      if (error.code === '23505') return { ok: true, duplicate: true }
      throw error
    }

    revalidatePath('/dashboard/scan')
    return { ok: true, duplicate: false }
  } catch (error) {
    return failure(error)
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
    return failure(error)
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
    return failure(error)
  }
}
