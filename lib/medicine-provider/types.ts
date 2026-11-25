import type { MedicineForm } from '@/lib/types'

/**
 * Medicine information provider abstraction.
 *
 * The active provider is drugdb.in (HealthPilot Drug Information Service,
 * Common Drug Codes for India / NRCeS). The interface below is the only thing
 * the application depends on, so providers can be swapped without touching
 * feature code.
 *
 * drugdb.in is open and needs no API key. Base URL defaults to
 * `https://drugdb.in` and can be overridden with `HEALTHPILOT_BASE_URL`.
 * Name search is served by `GET /search`; concept lookups by DISB behind the
 * same origin (`GET /dis/medicine|generic|substance/{sctId}`).
 */

export type MedicineInfo = {
  name: string
  strength: string | null
  form: MedicineForm | null
  brand: string | null
  manufacturer: string | null
  barcode: string | null
}

/**
 * How much trust a piece of information carries.
 *  - `verified`: taken from an official source (e.g. an FDA drug label).
 *  - `educational`: general, non-medicine-specific guidance.
 *  - `unavailable`: the source did not provide this; nothing is shown.
 */
export type InfoConfidence = 'verified' | 'educational' | 'unavailable'

export type InfoSource = {
  label: string
  url: string
}

export type MedicineSection = {
  confidence: InfoConfidence
  text: string | null
  source: InfoSource | null
}

export type MedicineIngredientRole = 'active' | 'inactive'

export type MedicineIngredient = {
  name: string
  strength: string | null
  role: MedicineIngredientRole
}

export type MedicineSearchResult = {
  providerRef: string
  name: string
  termType: string
}

export type MedicineDetail = {
  providerRef: string
  setid: string | null
  name: string
  genericName: string | null
  brandName: string | null
  manufacturer: string | null
  licenseStatus: string | null
  form: MedicineForm | null
  strength: string | null
  route: string | null
  ingredients: MedicineIngredient[]
  ingredientsConfidence: InfoConfidence
  uses: MedicineSection
  administration: MedicineSection
  sideEffects: MedicineSection
  warnings: MedicineSection
  interactions: MedicineSection
  foodGuidance: MedicineSection
  sources: InfoSource[]
  retrievedAt: string
  /** RxNorm-linked products for package concepts; not persisted in the shared cache. */
  components?: MedicineDetail[]
}

export type ProviderFailureReason =
  | 'not_configured'
  | 'contract-unavailable'
  | 'not_found'
  | 'error'

export type ProviderResult<T> =
  | { ok: true; provider: string; data: T }
  | { ok: false; provider: string; reason: ProviderFailureReason; message: string }

export interface MedicineInfoProvider {
  readonly id: string
  readonly label: string
  isConfigured(): boolean
  lookupByBarcode(barcode: string): Promise<ProviderResult<MedicineInfo>>
  lookupByName(query: string): Promise<ProviderResult<MedicineInfo[]>>

  /**
   * Rich intelligence is optional so the HealthPilot stub stays valid. A
   * provider that can do more advertises it here; the UI checks support before
   * promising anything.
   */
  searchByName?(query: string): Promise<ProviderResult<MedicineSearchResult[]>>
  getDetail?(providerRef: string): Promise<ProviderResult<MedicineDetail>>
}

export type IntelligencedProvider = MedicineInfoProvider &
  Required<Pick<MedicineInfoProvider, 'searchByName' | 'getDetail'>>

export function supportsIntelligence(
  provider: MedicineInfoProvider,
): provider is IntelligencedProvider {
  return (
    typeof provider.searchByName === 'function' &&
    typeof provider.getDetail === 'function'
  )
}
