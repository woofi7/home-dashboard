import { widgetEndpoint } from '../../utils/widgetError'
import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'

import definition from '#shared/widgetDefinitions/uptimekuma'
export const meta = definition

// Parses a single Prometheus label string: {k="v",k2="v2",...}
function parseLabels(labelStr: string): Record<string, string> {
  const labels: Record<string, string> = {}
  const re = /(\w+)="([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(labelStr)) !== null) {
    labels[m[1]!] = m[2]!
  }
  return labels
}

// Parses Prometheus text exposition format into a flat list of samples.
function parsePrometheus(text: string): Array<{ name: string; labels: Record<string, string>; value: number }> {
  const samples: Array<{ name: string; labels: Record<string, string>; value: number }> = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#'))
      continue
    const braceOpen = line.indexOf('{')
    const braceClose = line.lastIndexOf('}')
    if (braceOpen === -1 || braceClose === -1)
      continue
    const metricName = line.slice(0, braceOpen)
    const labelStr = line.slice(braceOpen + 1, braceClose)
    const valueStr = line.slice(braceClose + 1).trim()
    const value = parseFloat(valueStr)
    if (Number.isNaN(value))
      continue
    samples.push({ name: metricName, labels: parseLabels(labelStr), value })
  }
  return samples
}

function avgRatio(samples: Array<{ name: string; labels: Record<string, string>; value: number }>, metricName: string, window: string): string {
  const vals = samples
    .filter(s => s.name === metricName && s.labels.window === window && s.labels.monitor_name)
    .map(s => s.value)
  if (vals.length === 0)
    return '-'
  return `${((vals.reduce((a, b) => a + b, 0) / vals.length) * 100).toFixed(1)}%`
}

export async function fetchUptimekuma(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey)
    return null

  const base = url.replace(/\/$/, '')

  // Uptime Kuma uses HTTP Basic Auth for /metrics — any username, API key as password.
  const basicToken = Buffer.from(`:${apiKey}`).toString('base64')
  const headers = { Authorization: `Basic ${basicToken}` }

  const response = await fetch(`${base}/metrics`, { headers })
  if (!response.ok)
    return null
  const text = await response.text()
  const samples = parsePrometheus(text)

  // Status: 1=UP, 0=DOWN, 2=PENDING, 3=MAINTENANCE
  const statusMap = new Map<string, number>()
  for (const s of samples) {
    if (s.name === 'monitor_status' && s.labels.monitor_name)
      statusMap.set(s.labels.monitor_name, s.value)
  }

  const total = statusMap.size
  let up = 0, down = 0, pending = 0, maintenance = 0
  const downNames: string[] = []
  for (const [name, v] of statusMap.entries()) {
    if (v === 1) up++
    else if (v === 0) { down++; downNames.push(name) }
    else if (v === 2) pending++
    else if (v === 3) maintenance++
  }
  const downServices = downNames.length > 0 ? downNames.join(', ') : '-'

  // Response time: monitor_response_time_seconds window="1d" (seconds -> ms)
  const pingVals = samples
    .filter(s => s.name === 'monitor_response_time_seconds' && s.labels.window === '1d' && s.labels.monitor_name)
    .map(s => s.value)
  const avgPing = pingVals.length > 0
    ? `${Math.round((pingVals.reduce((a, b) => a + b, 0) / pingVals.length) * 1000)} ms`
    : '-'

  // Cert validity
  const certValidSamples = samples.filter(s => s.name === 'monitor_cert_is_valid' && s.labels.monitor_name)
  const certValid = certValidSamples.length > 0
    ? certValidSamples.filter(s => s.value === 1).length
    : '-'

  // Min cert expiry days
  const certExpirySamples = samples
    .filter(s => s.name === 'monitor_cert_days_remaining' && s.labels.monitor_name)
    .map(s => s.value)
  const minCertExpiry = certExpirySamples.length > 0
    ? `${Math.min(...certExpirySamples)} d`
    : '-'

  const allFields = [
    { label: 'Monitors',        value: total },
    { label: 'Up',              value: up },
    { label: 'Down',            value: down },
    { label: 'Down Services',   value: downServices },
    { label: 'Pending',         value: pending },
    { label: 'Maintenance',     value: maintenance },
    { label: 'Uptime 1d',       value: avgRatio(samples, 'monitor_uptime_ratio', '1d') },
    { label: 'Uptime 30d',      value: avgRatio(samples, 'monitor_uptime_ratio', '30d') },
    { label: 'Uptime 1y',       value: avgRatio(samples, 'monitor_uptime_ratio', '365d') },
    { label: 'Avg Ping',        value: avgPing },
    { label: 'Cert Valid',      value: certValid },
    { label: 'Min Cert Expiry', value: minCertExpiry },
  ]

  return { type: 'uptimekuma', fields: getOrderedActiveFields('uptimekuma', allFields) }
}

export { fetchUptimekuma as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchUptimekuma, ['url', 'apiKey']))
