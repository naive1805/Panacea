import { getJson, getText } from './http'
import type { MedicineIngredient } from './types'

/**
 * DailyMed API client (U.S. National Library of Medicine).
 *
 * Documentation: https://dailymed.nlm.nih.gov/dailymed/app-support-web-services.cfm
 * Base URL:      https://dailymed.nlm.nih.gov/dailymed/services/v2
 *
 * DailyMed serves FDA Structured Product Labeling (SPL) — the official
 * package insert. It is free, needs no API key, and is the source of the
 * clinical narrative (ingredients, uses, administration, warnings). Labels
 * are XML; this module extracts the parts Panacea shows and never invents
 * content that is absent.
 */

const DAILYMED_BASE = 'https://dailymed.nlm.nih.gov/dailymed/services/v2'

export const LOINC = {
  boxedWarning: '34066-1',
  indications: '34067-9',
  dosage: '34068-7',
  contraindications: '34070-3',
  warnings: '43685-7',
  adverseReactions: '34084-4',
  drugInteractions: '34073-7',
} as const

export type SplSearchHit = {
  setid: string
  title: string
  publishedDate: string
}

export type ParsedSpl = {
  title: string | null
  genericName: string | null
  formDisplay: string | null
  activeIngredients: MedicineIngredient[]
  inactiveIngredients: MedicineIngredient[]
  sections: Record<string, string>
  allText: string
}

type SplListResponse = {
  data?: Array<{
    setid?: string
    title?: string
    published_date?: string
  }>
}

export function splSourceUrl(setid: string): string {
  return `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`
}

export async function searchDailyMedByName(
  name: string,
  limit = 10,
): Promise<SplSearchHit[]> {
  const trimmed = name.trim()
  if (!trimmed) return []
  const data = await getJson<SplListResponse>(
    `${DAILYMED_BASE}/spls.json?drug_name=${encodeURIComponent(trimmed)}&name_type=both&pagesize=${limit}`,
  )
  const hits: SplSearchHit[] = []
  for (const row of data?.data ?? []) {
    if (!row.setid || !row.title) continue
    hits.push({
      setid: row.setid,
      title: row.title,
      publishedDate: row.published_date ?? '',
    })
  }
  return hits
}

export async function fetchSplXml(setid: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/i.test(setid)) return null
  return getText(`${DAILYMED_BASE}/spls/${setid}.xml`, 12000)
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
}

function stripTags(xml: string): string {
  return decodeEntities(xml.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function firstMatch(source: string, pattern: RegExp): string | null {
  const match = source.match(pattern)
  return match?.[1] ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : null
}

function parseIngredientBlock(block: string): MedicineIngredient | null {
  const name = firstMatch(block, /<name>([^<]+)<\/name>/i)
  if (!name) return null
  // SPL labels order the numerator attributes differently — `value` may come
  // before or after `unit` — so read each attribute on its own. Missing or
  // malformed attributes leave the strength null rather than guessing.
  const numerator = block.match(/<numerator\b[^>]*>/i)?.[0] ?? ''
  const value = numerator.match(/\bvalue="([^"]*)"/i)?.[1]?.trim() ?? ''
  const unit = numerator.match(/\bunit="([^"]*)"/i)?.[1]?.trim() ?? ''
  const strength =
    value && unit && unit !== '1' ? `${value} ${unit}` : value || null
  return { name, strength, role: 'active' }
}

function parseIngredients(xml: string): {
  active: MedicineIngredient[]
  inactive: MedicineIngredient[]
} {
  const active: MedicineIngredient[] = []
  const inactive: MedicineIngredient[] = []
  const blocks = xml.matchAll(
    /<ingredient\s+classCode="([A-Z]+)"[^>]*>([\s\S]*?)<\/ingredient>/gi,
  )
  for (const block of blocks) {
    const classCode = (block[1] ?? '').toUpperCase()
    const parsed = parseIngredientBlock(block[2] ?? '')
    if (!parsed) continue
    if (classCode.startsWith('IACT')) {
      inactive.push({ ...parsed, role: 'inactive' })
    } else if (classCode.startsWith('ACT')) {
      active.push(parsed)
    }
  }
  return { active, inactive }
}

function parseSections(xml: string): Record<string, string> {
  const markers: Array<{ code: string; index: number }> = []
  const markerRe =
    /<code\s+code="([0-9]{4,5}-[0-9])"\s+codeSystem="2\.16\.840\.1\.113883\.6\.1"/gi
  let match: RegExpExecArray | null
  while ((match = markerRe.exec(xml)) !== null) {
    if (match[1]) markers.push({ code: match[1], index: match.index })
  }

  const sections: Record<string, string> = {}
  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i]
    if (!marker) continue
    const end = markers[i + 1]?.index ?? xml.length
    const chunk = xml.slice(marker.index, end)
    // Drop the section's own <title> so it is not duplicated in the body text.
    const withoutTitle = chunk.replace(/<title>[\s\S]*?<\/title>/i, ' ')
    const text = stripTags(withoutTitle)
    if (text && !sections[marker.code]) sections[marker.code] = text
  }
  return sections
}

export function parseSpl(xml: string): ParsedSpl {
  const { active, inactive } = parseIngredients(xml)
  const sections = parseSections(xml)
  const genericName =
    firstMatch(xml, /<genericMedicine>\s*<name>([^<]+)<\/name>/i) ??
    firstMatch(xml, /<asEntityWithGeneric>[\s\S]*?<name>([^<]+)<\/name>/i)
  const formDisplay = firstMatch(
    xml,
    /<formCode[^>]*displayName="([^"]+)"/i,
  )
  const title = firstMatch(xml, /<title>([^<]+)<\/title>/i)

  return {
    title,
    genericName,
    formDisplay,
    activeIngredients: active,
    inactiveIngredients: inactive,
    sections,
    allText: stripTags(xml),
  }
}

const FOOD_TERMS =
  /(with food|without food|empty stomach|with meals|with a meal|food effect|food has|effect of food|grapefruit|fasted state|fed state|take .{0,20}food|food and fluid|restricted food|with or without food)/i

export function extractFoodStatements(allText: string): string | null {
  const sentences = allText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && FOOD_TERMS.test(sentence))

  if (sentences.length === 0) return null

  const unique: string[] = []
  for (const sentence of sentences) {
    if (!unique.some((existing) => existing === sentence)) unique.push(sentence)
    if (unique.length >= 6) break
  }
  return unique.join(' ')
}
