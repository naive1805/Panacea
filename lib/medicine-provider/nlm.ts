import type { MedicineForm } from '@/lib/types'

import {
  LOINC,
  extractFoodStatements,
  fetchSplXml,
  parseSpl,
  searchDailyMedByName,
  splSourceUrl,
  type ParsedSpl,
  type SplSearchHit,
} from './dailymed'
import { NlmUnreachableError } from './http'
import {
  barcodeToNdcCandidates,
  getRxNormIngredients,
  getRxNormProperties,
  rxcuiFromNdc,
  searchRxNormByName,
} from './rxnorm'
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
 * RxNorm + DailyMed provider (both NIH/NLM, both open, no API key).
 *
 * Every medical statement carries its source and a retrieval timestamp, or is
 * reported as unavailable. Nothing is inferred. A DailyMed label is only
 * accepted when its active ingredients actually match the RxNorm concept, so
 * an ambiguous search can never silently attach the wrong medicine.
 */

const RXNAV_SOURCE = (rxcui: string): InfoSource => ({
  label: 'RxNorm concept (NIH)',
  url: `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${rxcui}`,
})

const DAILYMED_SOURCE = (setid: string): InfoSource => ({
  label: 'DailyMed FDA label (NIH)',
  url: splSourceUrl(setid),
})

const ID = 'rxnorm-dailymed'
const LABEL = 'RxNorm / DailyMed (NIH)'

const BRANDED_TERM_TYPES = new Set(['SBD', 'SBDC', 'SBDF', 'BN', 'BPCK'])

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function ingredientMatches(rx: string, spl: string): boolean {
  const a = normalize(rx)
  const b = normalize(spl)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function parseStrength(text: string): string | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|ml|mL|%|units?|iu)\b/i)
  return match ? `${match[1]} ${match[2]}` : null
}

/** Every strength named in a text, in order and de-duplicated. A combination
 *  concept such as "linagliptin 2.5 MG / metformin 500 MG" yields both. */
function parseStrengths(text: string): string[] {
  const matches = text.matchAll(
    /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|ml|mL|%|units?|iu)\b/gi,
  )
  const out: string[] = []
  for (const match of matches) {
    const value = match[1]
    const unit = match[2]
    if (!value || !unit) continue
    const strength = `${value} ${unit}`
    if (!out.some((existing) => normalize(existing) === normalize(strength))) {
      out.push(strength)
    }
  }
  return out
}

function mapForm(text: string): MedicineForm | null {
  const value = text.toLowerCase()
  if (value.includes('tablet')) return 'tablet'
  if (value.includes('capsule')) return 'capsule'
  if (
    /solution|syrup|suspension|liquid|elixir|emulsion|drops?/.test(value) &&
    !value.includes('drop')
  ) {
    return 'liquid'
  }
  if (value.includes('drop')) return 'drops'
  if (/cream|gel|ointment|lotion|foam|paste/.test(value)) return 'cream'
  if (/inhal|aerosol|spray|nebuli/.test(value)) return 'inhaler'
  if (/inject|vial|syringe|infusion|intravenous|subcutaneous/.test(value)) {
    return 'injection'
  }
  if (/patch|transdermal/.test(value)) return 'patch'
  return null
}

function section(text: string | undefined | null, source: InfoSource | null): MedicineSection {
  const clean = text?.trim()
  if (!clean) return { confidence: 'unavailable', text: null, source: null }
  return { confidence: 'verified', text: clean, source }
}

function failure(
  reason: 'not_configured' | 'contract-unavailable' | 'not_found' | 'error',
  message: string,
): ProviderResult<never> {
  return { ok: false, provider: ID, reason, message }
}

function dedupeByName(names: string[]): string[] {
  const out: string[] = []
  for (const name of names) {
    if (!out.some((existing) => normalize(existing) === normalize(name))) {
      out.push(name)
    }
  }
  return out
}

/**
 * A DailyMed label is only accepted when its active ingredient set exactly
 * matches the RxNorm concept's ingredients AND, when the concept names
 * strengths, the label declares every one of them. This deliberately rejects
 * combination products (e.g. dapagliflozin + metformin) when the user looked
 * up the single ingredient, and rejects a same-ingredient label of the wrong
 * strength, so the wrong label can never be attached.
 */
function scoreLabel(
  parsed: ParsedSpl,
  rxIngredients: string[],
  propertiesName: string,
): number {
  if (rxIngredients.length === 0) return 0
  const activeNames = dedupeByName(parsed.activeIngredients.map((item) => item.name))
  if (activeNames.length === 0) return 0

  const allRxPresent = rxIngredients.every((rx) =>
    activeNames.some((name) => ingredientMatches(rx, name)),
  )
  if (!allRxPresent) return 0

  const extras = activeNames.filter(
    (name) => !rxIngredients.some((rx) => ingredientMatches(rx, name)),
  )
  if (extras.length > 0) return 0

  // When the concept names a strength, the label must declare every one of
  // them. A single mismatch means this is a different product (e.g. a 400 mg
  // label for a 200 mg concept), so the label is rejected outright.
  const requiredStrengths = parseStrengths(propertiesName)
  if (requiredStrengths.length > 0) {
    const labelStrengths = new Set(
      parsed.activeIngredients
        .map((item) => item.strength)
        .filter((value): value is string => Boolean(value))
        .map((value) => normalize(value)),
    )
    const everyStrengthPresent = requiredStrengths.every((strength) =>
      labelStrengths.has(normalize(strength)),
    )
    if (!everyStrengthPresent) return 0
  }

  let score = 4
  if (requiredStrengths.length > 0) score += 2
  const targetForm = mapForm(propertiesName)
  if (targetForm && mapForm(parsed.formDisplay ?? '') === targetForm) score += 1
  return score
}

/** Collapses the repeated ingredient rows a single SPL declares across product
 *  configurations into one entry per ingredient, keeping the strength named by
 *  the RxNorm concept. When several strengths exist and none is named by the
 *  concept, the strength is left null rather than guessing. */
function collapseIngredients(
  list: MedicineIngredient[],
  preferredStrengths: string[],
): MedicineIngredient[] {
  const order: string[] = []
  const byName = new Map<string, MedicineIngredient>()
  const strengths = new Map<string, Set<string>>()

  for (const item of list) {
    const key = normalize(item.name)
    if (!byName.has(key)) {
      byName.set(key, { name: item.name, strength: null, role: item.role })
      order.push(key)
    }
    if (item.strength) {
      const set = strengths.get(key) ?? new Set<string>()
      set.add(item.strength)
      strengths.set(key, set)
    }
  }

  const preferred = new Set(preferredStrengths.map((value) => normalize(value)))

  return order.map((key) => {
    const entry = byName.get(key) as MedicineIngredient
    const set = strengths.get(key)
    if (!set || set.size === 0) {
      entry.strength = null
      return entry
    }

    const values = [...set]
    const match = values.find((value) => preferred.has(normalize(value)))
    if (match) {
      entry.strength = match
    } else if (values.length === 1) {
      // A single declared strength is unambiguous, so it can be shown.
      entry.strength = values[0] ?? null
    } else {
      // Several strengths but none named by the concept: never guess.
      entry.strength = null
    }
    return entry
  })
}

async function findMatchedLabel(
  rxIngredients: string[],
  fallbackName: string,
): Promise<{ setid: string; parsed: ParsedSpl } | null> {
  // A combination's label is often reachable only through one of its
  // ingredients, so search by the concept name and each ingredient rather than
  // the first alone. Hits are de-duplicated and capped to keep lookups quick.
  const terms: string[] = []
  for (const value of [fallbackName, ...rxIngredients]) {
    const trimmed = value.trim()
    if (!trimmed) continue
    if (!terms.some((term) => normalize(term) === normalize(trimmed))) {
      terms.push(trimmed)
    }
  }

  const seen = new Set<string>()
  const hits: SplSearchHit[] = []
  for (const term of terms) {
    const results = await searchDailyMedByName(term, 6)
    for (const hit of results) {
      if (seen.has(hit.setid)) continue
      seen.add(hit.setid)
      hits.push(hit)
      if (hits.length >= 8) break
    }
    if (hits.length >= 8) break
  }

  let best: { setid: string; parsed: ParsedSpl; score: number } | null = null
  for (const hit of hits.slice(0, 8)) {
    const xml = await fetchSplXml(hit.setid)
    if (!xml) continue
    const parsed = parseSpl(xml)
    const score = scoreLabel(parsed, rxIngredients, fallbackName)
    if (score <= 0) continue
    if (!best || score > best.score) {
      best = { setid: hit.setid, parsed, score }
    }
  }

  return best ? { setid: best.setid, parsed: best.parsed } : null
}

function buildFromLabel(
  providerRef: string,
  setid: string,
  parsed: ParsedSpl,
  propertiesName: string,
  termType: string,
): MedicineDetail {
  const source = DAILYMED_SOURCE(setid)
  const warningsText = [
    parsed.sections[LOINC.boxedWarning],
    parsed.sections[LOINC.warnings],
    parsed.sections[LOINC.contraindications],
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join('\n\n')

  const ingredients = collapseIngredients(
    [...parsed.activeIngredients, ...parsed.inactiveIngredients],
    parseStrengths(propertiesName),
  )
  const activeStrengths = ingredients
    .filter((item) => item.role === 'active')
    .map((item) => item.strength)
    .filter((value): value is string => Boolean(value))
  const strength =
    activeStrengths.length > 0 ? [...new Set(activeStrengths)].join(' / ') : null

  return {
    providerRef,
    setid,
    name: parsed.genericName ?? propertiesName,
    genericName: parsed.genericName ?? propertiesName,
    brandName: BRANDED_TERM_TYPES.has(termType) ? propertiesName : null,
    manufacturer: null,
    licenseStatus: null,
    form: mapForm(parsed.formDisplay ?? propertiesName),
    strength,
    route: null,
    ingredients,
    ingredientsConfidence:
      parsed.activeIngredients.length > 0 || parsed.inactiveIngredients.length > 0
        ? 'verified'
        : 'unavailable',
    uses: section(parsed.sections[LOINC.indications], source),
    administration: section(parsed.sections[LOINC.dosage], source),
    sideEffects: section(parsed.sections[LOINC.adverseReactions], source),
    warnings: section(warningsText, source),
    interactions: section(parsed.sections[LOINC.drugInteractions], source),
    foodGuidance: section(extractFoodStatements(parsed.allText), source),
    sources: [RXNAV_SOURCE(providerRef), source],
    retrievedAt: new Date().toISOString(),
  }
}

function buildFromRxNorm(
  providerRef: string,
  propertiesName: string,
  termType: string,
  ingredientNames: string[],
): MedicineDetail {
  const ingredients: MedicineIngredient[] = ingredientNames.map((name) => ({
    name,
    strength: null,
    role: 'active',
  }))

  return {
    providerRef,
    setid: null,
    name: propertiesName,
    genericName: ingredientNames.length > 0 ? ingredientNames.join(' / ') : propertiesName,
    brandName: BRANDED_TERM_TYPES.has(termType) ? propertiesName : null,
    manufacturer: null,
    licenseStatus: null,
    form: mapForm(propertiesName),
    strength: parseStrength(propertiesName),
    route: null,
    ingredients,
    ingredientsConfidence: ingredients.length > 0 ? 'verified' : 'unavailable',
    uses: section(null, null),
    administration: section(null, null),
    sideEffects: section(null, null),
    warnings: section(null, null),
    interactions: section(null, null),
    foodGuidance: section(null, null),
    sources: [RXNAV_SOURCE(providerRef)],
    retrievedAt: new Date().toISOString(),
  }
}

export const nlmProvider: MedicineInfoProvider = {
  id: ID,
  label: LABEL,

  isConfigured(): boolean {
    return true
  },

  async searchByName(query: string): Promise<ProviderResult<MedicineSearchResult[]>> {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      return failure('not_found', 'Type at least two letters to search.')
    }
    try {
      const results = await searchRxNormByName(trimmed)
      if (results.length === 0) {
        return failure(
          'not_found',
          'No medicine matched that name. Check the spelling, or add it by hand.',
        )
      }
      return { ok: true, provider: ID, data: results }
    } catch (error) {
      if (error instanceof NlmUnreachableError) {
        return failure(
          'error',
          'The medicine information service could not be reached. Please try again shortly.',
        )
      }
      return failure('error', 'The medicine search failed unexpectedly.')
    }
  },

  async getDetail(providerRef: string): Promise<ProviderResult<MedicineDetail>> {
    if (!/^\d+$/.test(providerRef)) {
      return failure('not_found', 'That medicine reference is not valid.')
    }
    try {
      const properties = await getRxNormProperties(providerRef)
      if (!properties) {
        return failure('not_found', 'That medicine could not be found in RxNorm.')
      }

      const ingredientNames = await getRxNormIngredients(providerRef)
      const matched = await findMatchedLabel(ingredientNames, properties.name)

      const detail = matched
        ? buildFromLabel(
            providerRef,
            matched.setid,
            matched.parsed,
            properties.name,
            properties.termType,
          )
        : buildFromRxNorm(
            providerRef,
            properties.name,
            properties.termType,
            ingredientNames,
          )

      return { ok: true, provider: ID, data: detail }
    } catch (error) {
      if (error instanceof NlmUnreachableError) {
        return failure(
          'error',
          'The medicine information service could not be reached. Please try again shortly.',
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

    try {
      const candidates = barcodeToNdcCandidates(trimmed)
      let rxcui: string | null = null
      for (const candidate of candidates) {
        rxcui = await rxcuiFromNdc(candidate)
        if (rxcui) break
      }

      if (!rxcui) {
        return failure(
          'not_found',
          'This barcode is not a U.S. NDC-backed code, or it is not in the RxNorm database. Add the medicine by hand — nothing is guessed.',
        )
      }

      const properties = await getRxNormProperties(rxcui)
      if (!properties) {
        return failure('not_found', 'That barcode resolved to an unknown medicine.')
      }

      return {
        ok: true,
        provider: ID,
        data: {
          name: properties.name,
          strength: parseStrength(properties.name),
          form: mapForm(properties.name),
          brand: null,
          manufacturer: null,
          barcode: trimmed,
        },
      }
    } catch (error) {
      if (error instanceof NlmUnreachableError) {
        return failure('error', 'The barcode service could not be reached. Try again shortly.')
      }
      return failure('error', 'The barcode lookup failed. Add the medicine by hand.')
    }
  },

  async lookupByName(query: string): Promise<ProviderResult<MedicineInfo[]>> {
    const trimmed = query.trim()
    if (!trimmed) {
      return failure('not_found', 'Type a medicine name to search.')
    }
    try {
      const results = await searchRxNormByName(trimmed, 8)
      if (results.length === 0) {
        return failure('not_found', 'No medicine matched that name.')
      }
      const data: MedicineInfo[] = results.map((result) => ({
        name: result.name,
        strength: parseStrength(result.name),
        form: mapForm(result.name),
        brand: null,
        manufacturer: null,
        barcode: null,
      }))
      return { ok: true, provider: ID, data }
    } catch (error) {
      if (error instanceof NlmUnreachableError) {
        return failure('error', 'The medicine information service could not be reached.')
      }
      return failure('error', 'The medicine search failed unexpectedly.')
    }
  },
}
