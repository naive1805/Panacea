import type { MedicineForm } from '@/lib/types'

import { DrugDbUnreachableError, getJson } from './drugdb-http'
import type {
  InfoSource,
  MedicineDetail,
  MedicineInfo,
  MedicineInfoProvider,
  MedicineIngredient,
  MedicineSearchResult,
  MedicineSection,
  ProviderResult,
} from './types'

/**
 * drugdb.in provider (HealthPilot Drug Information Service).
 *
 * Source: Common Drug Codes for India, NRCeS at C-DAC Pune (https://drugdb.in,
 * https://nrces.in). Open service, no API key. SNOMED CT concept identifiers.
 *
 * - Name search: `GET {base}/search?q=&type=&limit=` and
 *   `GET {base}/search?q=&detail=full` (medicine search joins the generic
 *   record), `GET {base}/search?id=&type=` (one record, always full detail).
 * - Concept detail: `GET {base}/dis/medicine/{sctId}` (brand, manufacturer,
 *   licence, pointer to generic), `GET {base}/dis/generic/{sctId}`
 *   (composition with strengths, dose form, route, indications,
 *   contra-indications, interactions), `GET {base}/dis/substance/{sctId}`.
 *
 * providerRef format is `{type}:{sctId}` where type is one of
 * `medicine | generic | substance`, e.g. `medicine:529451000189107`.
 * Every clinical statement carries its source or is reported as unavailable.
 * Nothing is inferred: drugdb.in supplies no dosage schedule and no dedicated
 * side-effects field, so those sections stay `unavailable` rather than
 * guessing from contra-indications text.
 */

const ID = 'drugdb'
const LABEL = 'drugdb.in (NRCeS India)'

function baseUrl(): string {
  const configured = process.env.HEALTHPILOT_BASE_URL?.trim().replace(/\/+$/, '')
  return configured || 'https://drugdb.in'
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function failure(
  reason: 'not_configured' | 'contract-unavailable' | 'not_found' | 'error',
  message: string,
): ProviderResult<never> {
  return { ok: false, provider: ID, reason, message }
}

// ---------------------------------------------------------------------------
// drugdb.in response shapes (only the fields Panacea reads)
// ---------------------------------------------------------------------------

type SearchSummaryRow = {
  medicineSctid?: string
  medicineName?: string
  genericSctid?: string
  genericName?: string
  name?: string
  substanceIdentifier?: string
  brand?: { brandName?: string; brandSctid?: string } | string
  'brand.brandName'?: string
  manufacturer?: { manufacturerName?: string } | string
  'manufacturer.manufacturerName'?: string
  doseForm?: string
  genericDetail?: GenericDetailInline
}

type GenericDetailInline = {
  genericSctid?: string
  name?: string
  doseForm?: string
  routeOfAdministration?: string
  indications?: string
  contraIndications?: string
  interaction_with_drugs?: string
  composition?: Array<{
    substanceSctid?: string
    substanceName?: string
    unit?: string
    strength?: string
  }>
}

type SearchResponse = {
  results?: SearchSummaryRow[]
}

type MedicineDisRow = {
  medicineName?: string
  medicineSctid?: string
  brand?: { sctid?: string; name?: string }
  manufacturer?: { manufacturerName?: string; country?: string }
  excipient?: string
  licenseNumber?: string
  licenseStatus?: string
  generic?: { sctid?: string; genericName?: string }
}

type GenericDisRow = {
  genericSctid?: string
  indications?: string
  contraIndications?: string
  interaction_with_drugs?: string
  doseForm?: string
  routeOfAdministration?: string
  composition?: Array<{
    substanceSctid?: string
    substanceName?: string
    unit?: string
    strength?: string
  }>
  drugTypes?: Array<{ typeName?: string }>
  source?: string
  lastUpdatedOn?: string
}

type SubstanceDisRow = {
  substanceInfo?: string
  toxicity?: string
  molecularWeight?: string
  lastUpdatedOn?: string
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapForm(text: string | null | undefined): MedicineForm | null {
  if (!text) return null
  const value = text.toLowerCase()
  if (value.includes('tablet')) return 'tablet'
  if (value.includes('capsule')) return 'capsule'
  if (/solution|syrup|suspension|liquid|elixir|emulsion|drops?/.test(value) && !value.includes('drop')) {
    return 'liquid'
  }
  if (value.includes('drop')) return 'drops'
  if (/cream|gel|ointment|lotion|foam|paste/.test(value)) return 'cream'
  if (/inhal|aerosol|spray|nebuli/.test(value)) return 'inhaler'
  if (/inject|vial|syringe|infusion|intravenous|subcutaneous/.test(value)) return 'injection'
  if (/patch|transdermal/.test(value)) return 'patch'
  return 'other'
}

/** "750/1" + "milligram/Tablet" -> "750 mg". Returns null when unparseable. */
function formatStrength(strength: string | undefined, unit: string | undefined): string | null {
  if (!strength) return null
  const amount = strength.split('/')[0]?.trim()
  if (!amount) return null
  const unitLower = (unit ?? '').toLowerCase()
  let short = ''
  if (unitLower.includes('milligram') || unitLower === 'mg') short = 'mg'
  else if (unitLower.includes('microgram') || unitLower.includes('mcg')) short = 'mcg'
  else if (unitLower.includes('gram')) short = 'g'
  else if (unitLower.includes('millilitre') || unitLower.includes('milliliter') || unitLower === 'ml') short = 'ml'
  else if (unitLower.includes('litre') || unitLower.includes('liter')) short = 'L'
  else if (unitLower.includes('unit')) short = 'units'
  else if (unitLower.includes('percent') || unitLower === '%') short = '%'
  else if (unitLower.includes('iu')) short = 'IU'
  if (short) return `${amount} ${short}`
  const unitPart = (unit ?? '').split('/')[0]?.trim()
  return unitPart ? `${amount} ${unitPart}` : amount
}

function section(text: string | undefined | null, source: InfoSource | null): MedicineSection {
  const clean = text?.trim()
  if (!clean) return { confidence: 'unavailable', text: null, source: null }
  return { confidence: 'verified', text: clean, source }
}

function sourceFor(type: 'medicine' | 'generic' | 'substance', sctId: string): InfoSource {
  const path =
    type === 'medicine'
      ? `/dis/medicine/${sctId}`
      : type === 'generic'
        ? `/dis/generic/${sctId}`
        : `/dis/substance/${sctId}`
  return { label: 'drugdb.in record (NRCeS India)', url: `${baseUrl()}${path}` }
}

export function parseProviderRef(ref: string): { type: 'medicine' | 'generic' | 'substance'; sctId: string } | null {
  const match = ref.trim().match(/^(medicine|generic|substance):(\d+)$/)
  if (!match?.[1] || !match?.[2]) return null
  return { type: match[1] as 'medicine' | 'generic' | 'substance', sctId: match[2] }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

async function searchType(
  query: string,
  type: 'medicine' | 'generic' | 'substance',
  limit: number,
  detailFull: boolean,
): Promise<MedicineSearchResult[]> {
  const params = new URLSearchParams({ q: query, type, limit: String(limit) })
  if (detailFull) params.set('detail', 'full')
  const data = await getJson<SearchResponse>(`${baseUrl()}/search?${params.toString()}`)
  const out: MedicineSearchResult[] = []
  for (const row of data?.results ?? []) {
    if (type === 'medicine' && row.medicineSctid && row.medicineName) {
      out.push({
        providerRef: `medicine:${row.medicineSctid}`,
        name: row.medicineName,
        termType: 'medicine',
      })
    } else if (type === 'generic') {
      const sctid = row.genericSctid ?? row.genericDetail?.genericSctid
      const name = row.genericName ?? row.name ?? row.genericDetail?.name
      if (sctid && name) {
        out.push({ providerRef: `generic:${sctid}`, name, termType: 'generic' })
      }
    } else if (type === 'substance') {
      const sctid = row.substanceIdentifier
      const name = row.name
      if (sctid && name) {
        out.push({ providerRef: `substance:${sctid}`, name, termType: 'substance' })
      }
    }
  }
  return out
}

function dedupe(results: MedicineSearchResult[]): MedicineSearchResult[] {
  const seen = new Set<string>()
  const out: MedicineSearchResult[] = []
  for (const result of results) {
    if (seen.has(result.providerRef)) continue
    seen.add(result.providerRef)
    out.push(result)
  }
  return out
}

// ---------------------------------------------------------------------------
// Detail builders
// ---------------------------------------------------------------------------

function buildMedicineDetail(
  providerRef: string,
  med: MedicineDisRow,
  generic: GenericDisRow | null,
): MedicineDetail {
  const sctId = parseProviderRef(providerRef)?.sctId ?? med.medicineSctid ?? ''
  const source = sourceFor('medicine', sctId)
  const genericSource = generic && med.generic?.sctid ? sourceFor('generic', med.generic.sctid) : source

  const ingredients: MedicineIngredient[] = (generic?.composition ?? []).flatMap((c) => {
    if (!c.substanceName) return []
    return [
      {
        name: c.substanceName,
        strength: formatStrength(c.strength, c.unit),
        role: 'active' as const,
      },
    ]
  })

  const strengths = ingredients
    .map((i) => i.strength)
    .filter((s): s is string => Boolean(s))
  const strength = strengths.length > 0 ? [...new Set(strengths)].join(' / ') : null

  const doseForm = generic?.doseForm ?? null
  const route = generic?.routeOfAdministration ?? null
  const administrationText = [doseForm, route].filter(Boolean).join(' · ') || null

  return {
    providerRef,
    setid: med.medicineSctid ?? null,
    name: med.medicineName ?? 'Unknown medicine',
    genericName: med.generic?.genericName ?? generic?.genericSctid ?? null,
    brandName: med.brand?.name ?? null,
    manufacturer: med.manufacturer?.manufacturerName ?? null,
    licenseStatus: med.licenseStatus ?? null,
    form: mapForm(doseForm),
    strength,
    route,
    ingredients,
    ingredientsConfidence: ingredients.length > 0 ? 'verified' : 'unavailable',
    uses: section(generic?.indications, genericSource),
    // drugdb.in publishes no dosage schedule — dose form + route is shown as
    // administration context, never invented directions.
    administration: section(administrationText, genericSource),
    // No dedicated side-effects field exists in drugdb.in; contra-indications
    // text must not be mislabelled as side effects.
    sideEffects: section(null, null),
    warnings: section(generic?.contraIndications, genericSource),
    interactions: section(generic?.interaction_with_drugs, genericSource),
    foodGuidance: section(null, null),
    sources: generic && med.generic?.sctid ? [source, genericSource] : [source],
    retrievedAt: new Date().toISOString(),
  }
}

function buildGenericDetail(providerRef: string, sctId: string, generic: GenericDisRow): MedicineDetail {
  const source = sourceFor('generic', sctId)
  const ingredients: MedicineIngredient[] = (generic.composition ?? []).flatMap((c) => {
    if (!c.substanceName) return []
    return [
      {
        name: c.substanceName,
        strength: formatStrength(c.strength, c.unit),
        role: 'active' as const,
      },
    ]
  })
  const strengths = ingredients.map((i) => i.strength).filter((s): s is string => Boolean(s))
  const doseForm = generic.doseForm ?? null
  const route = generic.routeOfAdministration ?? null
  const name = `Generic ${sctId}`
  void name

  return {
    providerRef,
    setid: null,
    name: ingredients.length > 0 ? ingredients.map((i) => i.name).join(' / ') : `Generic ${sctId}`,
    genericName: ingredients.length > 0 ? ingredients.map((i) => i.name).join(' / ') : null,
    brandName: null,
    manufacturer: null,
    licenseStatus: null,
    form: mapForm(doseForm),
    strength: strengths.length > 0 ? [...new Set(strengths)].join(' / ') : null,
    route,
    ingredients,
    ingredientsConfidence: ingredients.length > 0 ? 'verified' : 'unavailable',
    uses: section(generic.indications, source),
    administration: section([doseForm, route].filter(Boolean).join(' · ') || null, source),
    sideEffects: section(null, null),
    warnings: section(generic.contraIndications, source),
    interactions: section(generic.interaction_with_drugs, source),
    foodGuidance: section(null, null),
    sources: [source],
    retrievedAt: new Date().toISOString(),
  }
}

function buildSubstanceDetail(providerRef: string, sctId: string, sub: SubstanceDisRow, name: string): MedicineDetail {
  const source = sourceFor('substance', sctId)
  const infoParts = [sub.substanceInfo, sub.molecularWeight ? `Molecular weight: ${sub.molecularWeight}` : null]
    .filter(Boolean)
    .join('\n\n')

  return {
    providerRef,
    setid: null,
    name,
    genericName: name,
    brandName: null,
    manufacturer: null,
    licenseStatus: null,
    form: null,
    strength: null,
    route: null,
    ingredients: [{ name, strength: null, role: 'active' }],
    ingredientsConfidence: 'verified',
    uses: section(infoParts || null, source),
    administration: section(null, null),
    sideEffects: section(null, null),
    warnings: section(sub.toxicity, source),
    interactions: section(null, null),
    foodGuidance: section(null, null),
    sources: [source],
    retrievedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const healthPilotProvider: MedicineInfoProvider = {
  id: ID,
  label: LABEL,

  isConfigured(): boolean {
    // drugdb.in is open and needs no key; a custom base URL may be supplied
    // for self-hosted DISB mirrors. Always configured by default.
    return true
  },

  async searchByName(query: string): Promise<ProviderResult<MedicineSearchResult[]>> {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      return failure('not_found', 'Type at least two letters to search.')
    }
    try {
      const [medicines, generics, substances] = await Promise.all([
        searchType(trimmed, 'medicine', 12, true),
        searchType(trimmed, 'generic', 8, false),
        searchType(trimmed, 'substance', 6, false),
      ])
      const merged = dedupe([...medicines, ...generics, ...substances]).slice(0, 25)
      if (merged.length === 0) {
        return failure(
          'not_found',
          'No medicine matched that name. Check the spelling, or try the salt (generic) name.',
        )
      }
      return { ok: true, provider: ID, data: merged }
    } catch (error) {
      if (error instanceof DrugDbUnreachableError) {
        return failure(
          'error',
          'The medicine information service (drugdb.in) could not be reached. Please try again shortly.',
        )
      }
      return failure('error', 'The medicine search failed unexpectedly.')
    }
  },

  async getDetail(providerRef: string): Promise<ProviderResult<MedicineDetail>> {
    const parsed = parseProviderRef(providerRef)
    if (!parsed) {
      return failure('not_found', 'That medicine reference is not valid.')
    }
    try {
      if (parsed.type === 'medicine') {
        // Single joined call: branded product + its generic composition.
        const params = new URLSearchParams({ id: parsed.sctId, type: 'medicine' })
        const searchData = await getJson<SearchResponse>(`${baseUrl()}/search?${params.toString()}`)
        const hit = searchData?.results?.[0]
        if (hit?.medicineSctid) {
          const inline = hit.genericDetail
          const genericSctid =
            (hit as unknown as Record<string, string>)['generic.sctid'] ??
            (hit as unknown as Record<string, string>)['genericDetail.genericSctid']
          void genericSctid
          const med: MedicineDisRow = {
            medicineName: hit.medicineName,
            medicineSctid: hit.medicineSctid,
            brand: { name: (hit as unknown as Record<string, string>)['brand.brandName'] },
            manufacturer: {
              manufacturerName: (hit as unknown as Record<string, string>)['manufacturer.manufacturerName'],
            },
            licenseStatus: (hit as unknown as Record<string, string>)['licenseStatus'] ?? null,
            generic: inline
              ? {
                  sctid: inline.genericSctid,
                  genericName: inline.name,
                }
              : undefined,
          }
          let generic: GenericDisRow | null = null
          if (inline) {
            generic = {
              genericSctid: inline.genericSctid,
              indications: (inline as unknown as Record<string, string>).indications,
              contraIndications: (inline as unknown as Record<string, string>).contraIndications,
              interaction_with_drugs: (inline as unknown as Record<string, string>).interaction_with_drugs,
              doseForm: inline.doseForm,
              routeOfAdministration: inline.routeOfAdministration,
              composition: inline.composition,
            }
          } else if (med.generic?.sctid) {
            const rows = await getJson<GenericDisRow[]>(`${baseUrl()}/dis/generic/${med.generic.sctid}`)
            const row = rows?.[0]
            if (row) generic = row
          }
          // Fall back to DISB rows when the joined search lacks clinical text.
          if (!generic?.indications && med.generic?.sctid) {
            const rows = await getJson<GenericDisRow[]>(`${baseUrl()}/dis/generic/${med.generic.sctid}`)
            if (rows?.[0]) generic = { ...generic, ...rows[0] }
          }
          if (!med.medicineName) {
            const rows = await getJson<MedicineDisRow[]>(`${baseUrl()}/dis/medicine/${parsed.sctId}`)
            if (rows?.[0]) Object.assign(med, rows[0])
          }
          if (!med.medicineName) {
            return failure('not_found', 'That medicine could not be found in drugdb.in.')
          }
          return { ok: true, provider: ID, data: buildMedicineDetail(providerRef, med, generic) }
        }

        // Fallback: direct DISB lookups.
        const medRows = await getJson<MedicineDisRow[]>(`${baseUrl()}/dis/medicine/${parsed.sctId}`)
        const med = medRows?.[0]
        if (!med?.medicineName) {
          return failure('not_found', 'That medicine could not be found in drugdb.in.')
        }
        let generic: GenericDisRow | null = null
        if (med.generic?.sctid) {
          const genRows = await getJson<GenericDisRow[]>(`${baseUrl()}/dis/generic/${med.generic.sctid}`)
          if (genRows?.[0]) generic = genRows[0]
        }
        return { ok: true, provider: ID, data: buildMedicineDetail(providerRef, med, generic) }
      }

      if (parsed.type === 'generic') {
        const rows = await getJson<GenericDisRow[]>(`${baseUrl()}/dis/generic/${parsed.sctId}`)
        const row = rows?.[0]
        if (!row) {
          return failure('not_found', 'That generic could not be found in drugdb.in.')
        }
        return { ok: true, provider: ID, data: buildGenericDetail(providerRef, parsed.sctId, row) }
      }

      // substance
      const rows = await getJson<SubstanceDisRow[]>(`${baseUrl()}/dis/substance/${parsed.sctId}`)
      const row = rows?.[0]
      // Resolve a display name via substance search when possible.
      let displayName = `Substance ${parsed.sctId}`
      try {
        const lookup = await getJson<SearchResponse>(
          `${baseUrl()}/search?id=${encodeURIComponent(parsed.sctId)}&type=substance`,
        )
        const hit = lookup?.results?.[0]
        if (hit?.name) displayName = hit.name
      } catch {
        // Name resolution is best-effort; the detail is still usable.
      }
      if (!row) {
        return failure('not_found', 'That substance could not be found in drugdb.in.')
      }
      return { ok: true, provider: ID, data: buildSubstanceDetail(providerRef, parsed.sctId, row, displayName) }
    } catch (error) {
      if (error instanceof DrugDbUnreachableError) {
        return failure(
          'error',
          'The medicine information service (drugdb.in) could not be reached. Please try again shortly.',
        )
      }
      return failure('error', 'The medicine details could not be loaded.')
    }
  },

  async lookupByBarcode(barcode: string): Promise<ProviderResult<MedicineInfo>> {
    const trimmed = barcode.trim()
    if (!trimmed) {
      return failure('not_found', 'Enter the number printed under the barcode.')
    }
    // drugdb.in exposes no barcode/GTIN lookup. Never guess: hand back to
    // manual entry with the code preserved.
    return failure(
      'not_found',
      'Barcode lookup is not supported by drugdb.in. Search by name instead, or add the medicine by hand — the barcode will be saved with it.',
    )
  },

  async lookupByName(query: string): Promise<ProviderResult<MedicineInfo[]>> {
    const trimmed = query.trim()
    if (!trimmed) {
      return failure('not_found', 'Type a medicine name to search.')
    }
    try {
      const [medicines, generics] = await Promise.all([
        searchType(trimmed, 'medicine', 6, true),
        searchType(trimmed, 'generic', 4, false),
      ])
      const merged = dedupe([...medicines, ...generics]).slice(0, 8)
      if (merged.length === 0) {
        return failure('not_found', 'No medicine matched that name.')
      }
      const data: MedicineInfo[] = merged.map((result) => ({
        name: result.name,
        strength: parseStrengthFromName(result.name),
        form: mapForm(result.name),
        brand: null,
        manufacturer: null,
        barcode: null,
      }))
      return { ok: true, provider: ID, data }
    } catch (error) {
      if (error instanceof DrugDbUnreachableError) {
        return failure('error', 'The medicine information service could not be reached.')
      }
      return failure('error', 'The medicine search failed unexpectedly.')
    }
  },
}

function parseStrengthFromName(text: string): string | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|ml|mL|%|units?|iu)\b/i)
  return match ? `${match[1]} ${match[2]}` : null
}

export { normalize as normalizeDrugDbName }
