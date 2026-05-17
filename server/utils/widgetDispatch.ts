import type { WidgetResult } from '../types'
import type { ServiceCredentials } from './auth'
import type { WidgetDefinition } from '#shared/widgetDefinitions/types'
import { WIDGETS } from './widgetRegistry'

export type { WidgetDefinition }

type Fetcher = (creds: ServiceCredentials) => Promise<WidgetResult | null>

export function fetchWidgetForService(
  type: string,
  creds: ServiceCredentials,
): Promise<WidgetResult | null> {
  const fn = (WIDGETS as Record<string, Fetcher>)[type]
  return (fn?.(creds) ?? Promise.resolve(null)).catch(() => null)
}
