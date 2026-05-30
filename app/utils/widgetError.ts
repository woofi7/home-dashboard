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
export type WidgetField = { label: string; value: unknown; suffix?: string }
export type WidgetResult = { type?: string; fields: WidgetField[] }
export type WidgetError = { error: WidgetErrorInfo }
export type WidgetOutcome = WidgetResult | WidgetError

export function isWidgetError(outcome: WidgetOutcome | null | undefined): outcome is WidgetError {
  return !!outcome && 'error' in outcome
}

const LABELS: Record<WidgetErrorKind, string> = {
  auth: 'Auth failed',
  notFound: 'Not found',
  unreachable: 'Unreachable',
  timeout: 'Timed out',
  badResponse: 'Error',
  noData: 'No data',
  config: 'Not configured',
  unknown: 'Unavailable',
}

export function widgetErrorLabel(info: WidgetErrorInfo): string {
  if (info.kind === 'badResponse')
    return info.status ? `Error ${info.status}` : 'Error'
  const base = LABELS[info.kind] ?? 'Unavailable'
  return info.status ? `${base} (${info.status})` : base
}

export function widgetErrorTooltip(info: WidgetErrorInfo): string {
  const label = widgetErrorLabel(info)
  return info.message ? `${label} - ${info.message}` : label
}
