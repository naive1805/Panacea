/**
 * Small HTTP helpers for the drugdb.in (HealthPilot DIS) provider.
 *
 * Server-only: imported from server actions, so network calls never reach the
 * browser. drugdb.in is open and needs no API key. A descriptive User-Agent is
 * sent; an optional `HEALTHPILOT_BASE_URL` overrides the default origin for
 * self-hosted DISB mirrors.
 */

const DEFAULT_USER_AGENT = 'Panacea/1.0 (medicine library; drugdb.in NRCeS India)'
const DEFAULT_TIMEOUT_MS = 10000

/** Thrown when drugdb.in cannot be reached, so callers can tell a network
 *  failure apart from a genuine "no match". */
export class DrugDbUnreachableError extends Error {
  constructor(message = 'drugdb.in service unreachable') {
    super(message)
    this.name = 'DrugDbUnreachableError'
  }
}

async function request(url: string, timeoutMs: number): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      headers: { 'User-Agent': DEFAULT_USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    })
  } catch {
    throw new DrugDbUnreachableError()
  } finally {
    clearTimeout(timer)
  }
}

export async function getJson<T>(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T | null> {
  const response = await request(url, timeoutMs)
  if (!response || !response.ok) return null
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}
