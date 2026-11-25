import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'
import type { Allergy } from '@/lib/types'

export type TypedClient = SupabaseClient<Database, 'public'>

export async function fetchAllergies(
  supabase: TypedClient,
  userId: string,
): Promise<Allergy[]> {
  const { data, error } = await supabase
    .from('allergies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}
