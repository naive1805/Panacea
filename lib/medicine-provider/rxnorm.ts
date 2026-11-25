import { getJson } from './http'
import type { MedicineSearchResult } from './types'

/**
 * RxNorm API client (U.S. National Library of Medicine).
 *
 * Documentation: https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html
 * Base URL:      https://rxnav.nlm.nih.gov/REST
 *
 * Only documented resources are called. RxNorm is free to use and needs no
 * API key. It supplies names, term types, ingredients, and NDC mapping — not
 * clinical narrative (that comes from DailyMed).
 */

const RXNAV_BASE = 'https://rxnav.nlm.nih.gov/REST'

type RxNavConcept = {
  rxcui?: string
  name?: string
  synonym?: string
  tty?: string
}

type DrugsResponse = {
  drugGroup?: { conceptGroup?: Array<{ conceptProperties?: RxNavConcept[] }> }
}

type ApproximateResponse = {
  approximateGroup?: { candidate?: Array<{ rxcui?: string; name?: string }> }
}

type PropertiesResponse = {
  properties?: { rxcui?: string; name?: string; tty?: string }
}

type RelatedResponse = {
  relatedGroup?: {
    conceptGroup?: Array<{ tty?: string; conceptProperties?: RxNavConcept[] }>
  }
}

type IdGroupResponse = { idGroup?: { rxnormId?: string[] } }

export type RxNormProperties = {
  rxcui: string
  name: string
  termType: string
}

function isRxcui(value: unknown): value is string {
  return typeof value === 'string' && /^\d+$/.test(value)
}

function conceptToResult(concept: RxNavConcept): MedicineSearchResult | null {
  if (!isRxcui(concept.rxcui) || !concept.name) return null
  return {
    providerRef: concept.rxcui,
    name: concept.name,
    termType: concept.tty ?? '',
  }
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

export async function searchRxNormByName(
  query: string,
  limit = 25,
): Promise<MedicineSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const drugs = await getJson<DrugsResponse>(
    `${RXNAV_BASE}/drugs.json?name=${encodeURIComponent(trimmed)}`,
  )

  const fromDrugs: MedicineSearchResult[] = []
  for (const group of drugs?.drugGroup?.conceptGroup ?? []) {
    for (const concept of group.conceptProperties ?? []) {
      const mapped = conceptToResult(concept)
      if (mapped) fromDrugs.push(mapped)
    }
  }

  if (fromDrugs.length > 0) {
    return dedupe(fromDrugs).slice(0, limit)
  }

  // Fall back to spelling/similarity suggestions so typos still resolve.
  const approximate = await getJson<ApproximateResponse>(
    `${RXNAV_BASE}/approximateTerm.json?term=${encodeURIComponent(trimmed)}&maxEntries=8`,
  )

  const candidates = (approximate?.approximateGroup?.candidate ?? []).filter(
    (candidate) => isRxcui(candidate.rxcui),
  )

  const resolved = await Promise.all(
    candidates.slice(0, 6).map(async (candidate) => {
      const properties = await getRxNormProperties(candidate.rxcui as string)
      if (!properties) return null
      return {
        providerRef: properties.rxcui,
        name: properties.name,
        termType: properties.termType,
      } satisfies MedicineSearchResult
    }),
  )

  return dedupe(resolved.filter((r): r is MedicineSearchResult => r !== null))
    .slice(0, limit)
}

export async function getRxNormProperties(
  rxcui: string,
): Promise<RxNormProperties | null> {
  if (!isRxcui(rxcui)) return null
  const data = await getJson<PropertiesResponse>(
    `${RXNAV_BASE}/rxcui/${rxcui}/properties.json`,
  )
  const properties = data?.properties
  if (!properties?.rxcui || !properties.name) return null
  return {
    rxcui: properties.rxcui,
    name: properties.name,
    termType: properties.tty ?? '',
  }
}

export async function getRxNormIngredients(rxcui: string): Promise<string[]> {
  if (!isRxcui(rxcui)) return []
  const data = await getJson<RelatedResponse>(
    `${RXNAV_BASE}/rxcui/${rxcui}/related.json?tty=IN`,
  )
  const names: string[] = []
  for (const group of data?.relatedGroup?.conceptGroup ?? []) {
    for (const concept of group.conceptProperties ?? []) {
      if (concept.name) names.push(concept.name)
    }
  }
  return [...new Set(names)]
}

export async function rxcuiFromNdc(ndc: string): Promise<string | null> {
  const digits = ndc.replace(/\D/g, '')
  if (digits.length !== 11) return null
  const data = await getJson<IdGroupResponse>(
    `${RXNAV_BASE}/rxcui.json?idtype=NDC&id=${encodeURIComponent(digits)}`,
  )
  const ids = data?.idGroup?.rxnormId ?? []
  return ids.find(isRxcui) ?? null
}

/**
 * Best-effort conversion of a pack barcode to candidate 11-digit NDCs.
 *
 * RxNorm's NDC lookup expects the 11-digit (5-4-2) NDC. Pack barcodes are
 * usually GTIN-13/14 (or UPC-A) that wrap an NDC plus a check digit and
 * sometimes a packaging indicator, and the NDC's own segment boundaries are
 * lost without the dashes. Rather than guess one answer, this returns every
 * plausible 11-digit candidate; RxNorm simply fails to match the wrong ones.
 * Only U.S. NDC-backed barcodes can resolve.
 */
export function barcodeToNdcCandidates(raw: string): string[] {
  const digits = raw.replace(/\D/g, '')
  const out = new Set<string>()

  const addIf11 = (value: string) => {
    if (/^\d{11}$/.test(value)) out.add(value)
  }

  const fromTen = (ten: string) => {
    addIf11(`0${ten.slice(0, 4)}${ten.slice(4)}`)
    addIf11(`${ten.slice(0, 5)}0${ten.slice(5)}`)
    addIf11(`${ten.slice(0, 9)}0${ten.slice(9)}`)
  }

  const fromCore = (core: string) => {
    if (core.length === 11) addIf11(core)
    else if (core.length === 10) fromTen(core)
    else if (core.length === 12) {
      addIf11(core.slice(1))
      addIf11(core.slice(0, 11))
    }
  }

  if (digits.length === 10 || digits.length === 11) fromCore(digits)

  if (digits.length >= 12) {
    const withoutCheck = digits.slice(0, -1)
    fromCore(withoutCheck)
    fromCore(withoutCheck.slice(1))
    fromCore(digits.slice(1, -1))
  }

  return [...out]
}
