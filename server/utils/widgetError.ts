import type { H3Event } from 'h3'
import type { WidgetResult } from '../types'
import type { ServiceCredentials } from './auth'
import { WIDGETS } from './widgetRegistry'

export type WidgetErrorKind =
  | 'auth'
  | 'notFound'
  | 'unreachable'
  | 'timeout'
  | 'badResponse'
  | 'noData'
  | 'config'
  | 'unknown'

export type WidgetErrorInfo = { kind: WidgetErrorKind; status?: number; message?: string }
export type WidgetError = { error: WidgetErrorInfo }
export type WidgetOutcome = WidgetResult | WidgetError

type WidgetFetcher = (creds: ServiceCredentials) => Promise<WidgetResult | null>

const UNREACHABLE_CODES = new Set([
  'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH',
  'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'UND_ERR_SOCKET',
])

export function classifyWidgetError(err: unknown): WidgetErrorInfo {
  const e = err as { response?: { status?: number }; statusCode?: number; status?: number; cause?: { code?: string }; code?: string; name?: string; message?: string }
  const status = e?.response?.status ?? e?.statusCode ?? e?.status
  const code = e?.cause?.code ?? e?.code
  const message = e?.message

  if (status === 401 || status === 403)
    return { kind: 'auth', status, message: 'Credentials refused' }
  if (status === 404)
    return { kind: 'notFound', status, message: 'Endpoint not found' }
  if (typeof status === 'number')
    return { kind: 'badResponse', status, message }

  if (e?.name === 'AbortError' || (code && code.includes('TIMEOUT')))
    return { kind: 'timeout', message: 'Request timed out' }
  if (code && UNREACHABLE_CODES.has(code))
    return { kind: 'unreachable', message: `Server not responding (${code})` }

  return { kind: 'unknown', message: message || 'Unknown error' }
}

export function isWidgetError(outcome: WidgetOutcome): outcome is WidgetError {
  return 'error' in outcome
}

export async function runWidget(fetchFn: WidgetFetcher, creds: ServiceCredentials): Promise<WidgetOutcome> {
  try {
    const result = await fetchFn(creds)
    if (result === null)
      return { error: { kind: 'noData', message: 'Connected but returned no data - check credentials' } }
    return result
  } catch (err) {
    return { error: classifyWidgetError(err) }
  }
}

export function fetchWidgetStatus(type: string, creds: ServiceCredentials): Promise<WidgetOutcome> {
  const fn = (WIDGETS as Record<string, WidgetFetcher>)[type]
  if (!fn)
    return Promise.resolve({ error: { kind: 'unknown', message: `Unknown widget type: ${type}` } })
  return runWidget(fn, creds)
}

export function widgetEndpoint(event: H3Event, fetchFn: WidgetFetcher, required: string[]): Promise<WidgetOutcome> {
  const creds = getQuery(event) as ServiceCredentials
  for (const field of required) {
    if (!creds[field as keyof ServiceCredentials])
      return Promise.resolve({ error: { kind: 'config', message: `${field} is required` } })
  }
  return runWidget(fetchFn, creds)
}
