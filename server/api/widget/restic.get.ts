import { widgetEndpoint } from '../../utils/widgetError'
import { readFileSync } from 'node:fs'
import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'

import definition from '#shared/widgetDefinitions/restic'
export const meta = definition

type Snapshot = { id: string; short_id: string; time: string; hostname?: string; paths?: string[]; tags?: string[] }

function formatAge(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60)
    return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)
    return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

export async function fetchRestic(creds: ServiceCredentials) {
  const { url } = creds
  if (!url)
    return null

  let snapshots: Snapshot[]

  if (url.startsWith('http://') || url.startsWith('https://')) {
    snapshots = await $fetch<Snapshot[]>(url)
  } else {
    const raw = readFileSync(url, 'utf-8')
    snapshots = JSON.parse(raw) as Snapshot[]
  }

  if (!snapshots.length) {
    return {
      type: 'restic',
      fields: getOrderedActiveFields('restic', [
        { label: 'Snapshots',   value: 0 },
        { label: 'Last Backup', value: '—' },
        { label: 'Age',         value: '—' },
        { label: 'Hostname',    value: '—' },
        { label: 'Paths',       value: '—' },
      ]),
    }
  }

  const sorted = [...snapshots].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const latest = sorted[0]!

  const allFields = [
    { label: 'Snapshots',   value: snapshots.length },
    { label: 'Last Backup', value: formatDate(latest.time) },
    { label: 'Age',         value: formatAge(latest.time) },
    { label: 'Hostname',    value: latest.hostname ?? '—' },
    { label: 'Paths',       value: (latest.paths ?? []).join(', ') || '—' },
  ]

  return { type: 'restic', fields: getOrderedActiveFields('restic', allFields) }
}

export { fetchRestic as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchRestic, ['url']))
