import type { TypedClient } from './medicines'

export type MedicineBarcodeRow = {
  id: string
  barcode: string
  format: string | null
  medicine_id: string | null
  created_at: string
  medicine_name: string | null
  medicine_strength: string | null
}

export async function fetchMedicineBarcodes(
  supabase: TypedClient,
  userId: string,
): Promise<MedicineBarcodeRow[]> {
  const [{ data: barcodes, error }, { data: medicines, error: medicinesError }] =
    await Promise.all([
      supabase
        .from('medicine_barcodes')
        .select('id, barcode, format, medicine_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('medicines')
        .select('id, name, strength')
        .eq('user_id', userId)
        .order('name', { ascending: true }),
    ])

  if (error) throw error
  if (medicinesError) throw medicinesError

  const medicineById = new Map(
    (medicines ?? []).map((medicine) => [medicine.id, medicine]),
  )

  return (barcodes ?? []).map((row) => {
    const medicine = row.medicine_id
      ? medicineById.get(row.medicine_id)
      : undefined
    return {
      ...row,
      medicine_name: medicine?.name ?? null,
      medicine_strength: medicine?.strength ?? null,
    }
  })
}
