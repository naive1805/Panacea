/**
 * Small HTTP helpers for the NLM provider clients.
 *
 * These run on the server only (imported from server actions), so the network
 * calls and any configuration never reach the browser. No API key is used:
 * RxNorm and DailyMed are open services. NLM asks callers to identify
 * themselves, so a descriptive User-Agent is sent and an optional, non-secret
 * `NLM_API_CONTACT` address is appended when configured.
 */

const DEFAULT_USER_AGENT = 'Panacea/1.0 (medicine library)'
const DEFAULT_TIMEOUT_MS = 8000

/** Thrown when the source cannot be reached, so callers can tell a network
 *  failure apart from a genuine "no match". */
export class NlmUnreachableError extends Error {
  constructor(message = 'NLM service unreachable') {
    super(message)
    this.name = 'NlmUnreachableError'
  }
}

export function nlmUserAgent(): string {
  const contact = process.env.NLM_API_CONTACT?.trim()
  return contact ? `${DEFAULT_USER_AGENT}; contact: ${contact}` : DEFAULT_USER_AGENT
}

async function request(
  url: string,
  accept: string,
  timeoutMs: number,
): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      headers: { 'User-Agent': nlmUserAgent(), Accept: accept },
      signal: controller.signal,
      cache: 'no-store',
    })
  } catch {
    throw new NlmUnreachableError()
  } finally {
    clearTimeout(timer)
  }
}

export async function getJson<T>(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T | null> {
  const response = await request(url, 'application/json', timeoutMs)
  if (!response || !response.ok) return null
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function getText(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string | null> {
  // DailyMed's SPL endpoint rejects a specific Accept header with HTTP 406;
  // it only serves the XML when the client accepts any content type.
  const response = await request(url, '*/*', timeoutMs)
  if (!response || !response.ok) return null
  try {
    return await response.text()
  } catch {
    return null
  }
}
