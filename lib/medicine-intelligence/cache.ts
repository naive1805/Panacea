import type { SupabaseClient } from '@supabase/supabase-js'

import { MEDICINE_FORMS } from '@/lib/constants'
import type {
  InfoConfidence,
  InfoSource,
  MedicineDetail,
  MedicineIngredient,
  MedicineSection,
} from '@/lib/medicine-provider/types'
import type { Database, Json } from '@/lib/supabase/database.types'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MedicineForm } from '@/lib/types'

/**
 * Read/write access to the shared `medicine_details` cache.
 *
 * Reads run through the caller's authenticated client, so the `select`-only RLS
 * policy applies. Writes use the server-only admin client, because ordinary
 * users have no insert/update privilege on the shared cache. Only successful
 * provider results are ever written; a cache failure never fails a lookup.
 */

type CacheRow = Database['public']['Tables']['medicine_details']['Row']
type CacheInsert = Database['public']['Tables']['medicine_details']['Insert']

export type TypedClient = SupabaseClient<Database, 'public'>

// How long a cached detail stays fresh, by how confident the ingredients are.
// A fully unavailable result is not worth caching at all (TTL 0).
const TTL_DAYS: Record<InfoConfidence, number> = {
  verified: 30,
  educational: 1,
  unavailable: 0,
}

const FORMS = new Set<string>(MEDICINE_FORMS.map((form) => form.value))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asForm(value: string | null): MedicineForm | null {
  return value && FORMS.has(value) ? (value as MedicineForm) : null
}

function asConfidence(value: string): InfoConfidence {
  return value === 'verified' || value === 'educational' ? value : 'unavailable'
}

function asSource(value: unknown): InfoSource | null {
  if (!isRecord(value)) return null
  const label = typeof value.label === 'string' ? value.label : null
  const url = typeof value.url === 'string' ? value.url : null
  return label && url ? { label, url } : null
}

function asSection(value: Json | null): MedicineSection {
  if (!isRecord(value)) return { confidence: 'unavailable', text: null, source: null }
  const confidence = asConfidence(typeof value.confidence === 'string' ? value.confidence : '')
  const text = typeof value.text === 'string' && value.text.trim() ? value.text : null
  if (confidence === 'unavailable' || !text) {
    return { confidence: 'unavailable', text: null, source: null }
  }
  return { confidence, text, source: asSource(value.source) }
}

function asIngredients(value: Json): MedicineIngredient[] {
  if (!Array.isArray(value)) return []
  const out: MedicineIngredient[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const name = typeof item.name === 'string' ? item.name : null
    if (!name) continue
    out.push({
      name,
      strength: typeof item.strength === 'string' ? item.strength : null,
      role: item.role === 'inactive' ? 'inactive' : 'active',
    })
  }
  return out
}

function asSources(value: Json): InfoSource[] {
  if (!Array.isArray(value)) return []
  return value
    .map(asSource)
    .filter((source): source is InfoSource => source !== null)
}

export function toMedicineDetail(row: CacheRow): MedicineDetail {
  return {
    providerRef: row.provider_ref,
    setid: row.setid,
    name: row.name,
    genericName: row.generic_name,
    brandName: row.brand_name,
    manufacturer: (row as { manufacturer?: string | null }).manufacturer ?? null,
    licenseStatus: (row as { license_status?: string | null }).license_status ?? null,
    form: asForm(row.form),
    strength: row.strength,
    route: (row as { route?: string | null }).route ?? null,
    ingredients: asIngredients(row.ingredients),
    ingredientsConfidence: asConfidence(row.ingredients_confidence),
    uses: asSection(row.uses),
    administration: asSection(row.administration),
    sideEffects: asSection(row.side_effects),
    warnings: asSection(row.warnings),
    interactions: asSection((row as { interactions?: Json | null }).interactions ?? null),
    foodGuidance: asSection(row.food_guidance),
    sources: asSources(row.sources),
    retrievedAt: row.retrieved_at,
  }
}

export function toCacheInsert(
  provider: string,
  detail: MedicineDetail,
  expiresAt: string,
): CacheInsert {
  return {
    provider,
    provider_ref: detail.providerRef,
    setid: detail.setid,
    name: detail.name,
    generic_name: detail.genericName,
    brand_name: detail.brandName,
    manufacturer: detail.manufacturer,
    license_status: detail.licenseStatus,
    form: detail.form,
    strength: detail.strength,
    route: detail.route,
    ingredients: detail.ingredients as unknown as Json,
    ingredients_confidence: detail.ingredientsConfidence,
    uses: detail.uses as unknown as Json,
    administration: detail.administration as unknown as Json,
    side_effects: detail.sideEffects as unknown as Json,
    warnings: detail.warnings as unknown as Json,
    interactions: detail.interactions as unknown as Json,
    food_guidance: detail.foodGuidance as unknown as Json,
    sources: detail.sources as unknown as Json,
    retrieved_at: detail.retrievedAt,
    expires_at: expiresAt,
  }
}

/**
 * Returns a cached detail only when the row is still fresh. An expired row is
 * treated as a miss so the caller refetches; a read error is also a miss.
 */
export async function readCachedDetail(
  supabase: TypedClient,
  provider: string,
  providerRef: string,
): Promise<MedicineDetail | null> {
  const { data, error } = await supabase
    .from('medicine_details')
    .select('*')
    .eq('provider', provider)
    .eq('provider_ref', providerRef)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error || !data) return null
  return toMedicineDetail(data)
}

/**
 * Best-effort cache write. Refreshes the row in place (upsert) so stale data is
 * replaced rather than duplicated. Callers should swallow any thrown error.
 */
export async function writeCachedDetail(
  provider: string,
  detail: MedicineDetail,
): Promise<void> {
  const ttlDays = TTL_DAYS[detail.ingredientsConfidence] ?? 0
  if (ttlDays <= 0) return

  const expiresAt = new Date(
    Date.now() + ttlDays * 24 * 60 * 60 * 1000,
  ).toISOString()

  const admin = createAdminClient()
  const { error } = await admin
    .from('medicine_details')
    .upsert(toCacheInsert(provider, detail, expiresAt), {
      onConflict: 'provider,provider_ref',
    })
  if (error) throw error
}
