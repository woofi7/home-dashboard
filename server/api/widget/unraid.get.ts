import type { ServiceCredentials } from '../../utils/auth'
import { getActiveFields } from '../../utils/widget-fields'
import { formatBytes, formatKilobytes } from '../../utils/formatBytes'

export const meta = { name: 'Unraid', authType: 'header', displayLabels: ['Array', 'Used', 'Disks', 'Parity', 'CPU', 'Memory'] } as const

export async function fetchUnraid(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey) return null

  const gql = `{
    array { state parityCheckStatus { status progress } capacity { kilobytes { free used total } disks { used total } } }
    metrics { cpu { percentTotal } memory { total available } }
  }`

  const data = await $fetch<{
    data: {
      array: {
        state: string
        parityCheckStatus: { status: string; progress: number }
        capacity: { kilobytes: { free: string; used: string; total: string }; disks: { used: string; total: string } }
      }
      metrics: { cpu: { percentTotal: number }; memory: { total: number; available: number } }
    }
  }>(new URL('/graphql', url).toString(), {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: { query: gql },
  })

  const arr = data.data.array
  const kb = arr.capacity.kilobytes
  const parity = arr.parityCheckStatus
  const { cpu, memory } = data.data.metrics

  const allFields = [
    { label: 'Array',  value: arr.state.charAt(0) + arr.state.slice(1).toLowerCase() },
    { label: 'Used',   value: `${formatKilobytes(kb.used)} / ${formatKilobytes(kb.total)}` },
    { label: 'Disks',  value: `${arr.capacity.disks.used} / ${arr.capacity.disks.total}` },
    { label: 'Parity', value: `${parity.status.charAt(0) + parity.status.slice(1).toLowerCase()}${parity.progress > 0 ? ` (${parity.progress}%)` : ''}` },
    { label: 'CPU',    value: `${cpu.percentTotal.toFixed(1)}%` },
    { label: 'Memory', value: `${formatBytes(memory.total - memory.available)} / ${formatBytes(memory.total)}` },
  ]

  const active = getActiveFields('unraid', allFields.map(f => f.label))
  return { type: 'unraid', fields: allFields.filter(f => active.has(f.label)) }
}

export { fetchUnraid as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url) throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey) throw createError({ statusCode: 400, message: 'apiKey is required' })
  return fetchUnraid(creds)
})
