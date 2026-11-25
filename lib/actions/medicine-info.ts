'use server'

import {
  getMedicineInfoProvider,
  supportsIntelligence,
} from '@/lib/medicine-provider'
import type {
  MedicineDetail,
  MedicineInfo,
  MedicineSearchResult,
  ProviderResult,
} from '@/lib/medicine-provider/types'
import { readCachedDetail, writeCachedDetail } from '@/lib/medicine-intelligence/cache'
import { requireUser } from '@/lib/server/session'

/**
 * Provider calls run on the server so any configuration stays server-side and
 * a lookup cannot be used as an open proxy. The reader must be signed in.
 */

function signedOut<T>(): ProviderResult<T> {
  return {
    ok: false,
    provider: 'panacea',
    reason: 'not_configured',
    message: 'Sign in to look up medicine information.',
  }
}

export async function lookupMedicineByBarcode(
  barcode: string,
): Promise<ProviderResult<MedicineInfo>> {
  try {
    await requireUser()
  } catch {
    return signedOut<MedicineInfo>()
  }

  return getMedicineInfoProvider().lookupByBarcode(barcode.trim())
}

export async function searchMedicines(
  query: string,
): Promise<ProviderResult<MedicineSearchResult[]>> {
  try {
    await requireUser()
  } catch {
    return signedOut<MedicineSearchResult[]>()
  }

  const provider = getMedicineInfoProvider()
  if (!supportsIntelligence(provider)) {
    return {
      ok: false,
      provider: provider.id,
      reason: 'contract-unavailable',
      message: 'Medicine search is not available for the configured provider.',
    }
  }

  return provider.searchByName(query)
}

export async function getMedicineDetail(
  providerRef: string,
): Promise<ProviderResult<MedicineDetail>> {
  const auth = await requireUser().catch(() => null)
  if (!auth) return signedOut<MedicineDetail>()
  const { supabase } = auth

  const provider = getMedicineInfoProvider()
  if (!supportsIntelligence(provider)) {
    return {
      ok: false,
      provider: provider.id,
      reason: 'contract-unavailable',
      message: 'Medicine details are not available for the configured provider.',
    }
  }

  const ref = providerRef.trim()
  // drugdb.in refs are `{type}:{sctId}`, e.g. `medicine:529451000189107`.
  // Legacy numeric RxCUI refs resolve as drugdb.in SCTIDs are numeric too —
  // treat a bare numeric ref as a medicine lookup for backwards compatibility.
  const normalized = /^(medicine|generic|substance):\d+$/.test(ref)
    ? ref
    : /^\d+$/.test(ref)
      ? `medicine:${ref}`
      : null
  if (!normalized) {
    return {
      ok: false,
      provider: provider.id,
      reason: 'not_found',
      message: 'That medicine reference is not valid.',
    }
  }

  const cached = await readCachedDetail(supabase, provider.id, normalized)
  if (cached) {
    return { ok: true, provider: provider.id, data: cached }
  }

  const result = await provider.getDetail(normalized)
  if (!result.ok) return result

  try {
    await writeCachedDetail(provider.id, result.data)
  } catch {
    // Best-effort: a cache write must never turn a good lookup into a failure.
  }

  return result
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function strengthAmount(value: string | null): string | null {
  if (!value) return null
  const match = value.match(/(\d+(?:\.\d+)?)/)
  return match?.[1] ?? null
}

/**
 * Recognize a library medicine (often added by hand) in drugdb.in.
 *
 * - When the medicine already carries a `provider_ref` from a previous
 *   lookup, that reference wins and is loaded directly.
 * - Otherwise the medicine name is searched and the best candidate is
 *   picked: an exact name hit first, then a same-strength hit, then the top
 *   medicine-type result. Substance/generic hits are only used when no
 *   branded medicine matched, so a hand-typed salt still resolves.
 *
 * Never throws: resolution failures return `null` so the library page can
 * render without intelligence rather than failing.
 */
export async function resolveLibraryMedicineDetail(input: {
  name: string
  strength?: string | null
  providerRef?: string | null
}): Promise<MedicineDetail | null> {
  try {
    const auth = await requireUser().catch(() => null)
    if (!auth) return null

    const directRef = input.providerRef?.trim()
    if (directRef) {
      const direct = await getMedicineDetail(directRef)
      if (direct.ok) return direct.data
      // A stale provider_ref must not block name-based recognition.
    }

    const name = input.name.trim()
    if (name.length < 2) return null

    const search = await searchMedicines(name)
    if (!search.ok || search.data.length === 0) return null

    const candidates = search.data
    const target = normalizeName(name)
    const targetAmount = strengthAmount(input.strength ?? null)

    // Prefer medicine-type hits so a brand resolves to its full record
    // (brand + manufacturer + composition) rather than a bare salt.
    const medicines = candidates.filter((c) => c.termType === 'medicine')
    const pool = medicines.length > 0 ? medicines : candidates

    let best = pool[0] ?? null
    if (best) {
      const exact = pool.find((c) => normalizeName(c.name) === target)
      if (exact) {
        best = exact
      } else if (targetAmount) {
        const sameStrength = pool.find((c) => {
          const amount = c.name.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|ml|mL|%|units?|iu)\b/i)?.[1]
          return amount === targetAmount
        })
        if (sameStrength) best = sameStrength
      } else {
        const startsWith = pool.find((c) => normalizeName(c.name).startsWith(target))
        if (startsWith) best = startsWith
      }
    }
    if (!best) return null

    const detail = await getMedicineDetail(best.providerRef)
    return detail.ok ? detail.data : null
  } catch {
    return null
  }
}
