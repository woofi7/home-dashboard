import { getActiveFields } from '../../utils/widget-fields'

function fmtKB(kb: string | number): string {
  const n = Number(kb)
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} TB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} GB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} MB`
  return `${n} KB`
}

function fmtBytes(b: number): string {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${b} B`
}

export async function fetchUnraid(creds: Record<string, string>) {
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
    { label: 'Used',   value: `${fmtKB(kb.used)} / ${fmtKB(kb.total)}` },
    { label: 'Disks',  value: `${arr.capacity.disks.used} / ${arr.capacity.disks.total}` },
    { label: 'Parity', value: `${parity.status.charAt(0) + parity.status.slice(1).toLowerCase()}${parity.progress > 0 ? ` (${parity.progress}%)` : ''}` },
    { label: 'CPU',    value: `${cpu.percentTotal.toFixed(1)}%` },
    { label: 'Memory', value: `${fmtBytes(memory.total - memory.available)} / ${fmtBytes(memory.total)}` },
  ]

  const active = getActiveFields('unraid', allFields.map(f => f.label))
  return { type: 'unraid', fields: allFields.filter(f => active.has(f.label)) }
}

export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as Record<string, string>
  if (!creds.url) throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey) throw createError({ statusCode: 400, message: 'apiKey is required' })
  return fetchUnraid(creds)
})
