import type { WidgetResult } from '../types'
import type { ServiceCredentials } from './auth'
import { WIDGETS } from './widgetRegistry'

export type WidgetMeta = { name: string; authType: string; displayLabels: readonly string[] }

type Fetcher = (creds: ServiceCredentials) => Promise<WidgetResult | null>

export function fetchWidgetForService(
  type: string,
  creds: ServiceCredentials,
): Promise<WidgetResult | null> {
  const fn = (WIDGETS as Record<string, Fetcher>)[type]
  return (fn?.(creds) ?? Promise.resolve(null)).catch(() => null)
}
