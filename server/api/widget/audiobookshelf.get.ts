import { getActiveFields } from '../../utils/widget-fields'

function fmtSize(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(1)} TB`
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  if (h >= 24) return `${(h / 24).toFixed(1)} days`
  return `${h} hrs`
}

export default defineEventHandler(async (event) => {
  const { url, apiKey } = getQuery(event) as Record<string, string>
  if (!url) throw createError({ statusCode: 400, message: 'url is required' })
  if (!apiKey) throw createError({ statusCode: 400, message: 'apiKey is required' })

  const base = url.replace(/\/$/, '')
  const headers = { Authorization: `Bearer ${apiKey}` }

  const { libraries } = await $fetch<{ libraries: Array<{ id: string; mediaType: string }> }>(`${base}/api/libraries`, { headers })

  const bookLibs = libraries.filter(l => l.mediaType === 'book')

  const stats = await Promise.all(
    bookLibs.map(l =>
      $fetch<{ totalItems: number; totalAuthors: number; totalSize: number; totalDuration: number }>(
        `${base}/api/libraries/${l.id}/stats`, { headers }
      )
    )
  )

  const totalItems = stats.reduce((s, r) => s + r.totalItems, 0)
  const totalAuthors = stats.reduce((s, r) => s + r.totalAuthors, 0)
  const totalSize = stats.reduce((s, r) => s + r.totalSize, 0)
  const totalDuration = stats.reduce((s, r) => s + r.totalDuration, 0)

  const allFields = [
    { label: 'Audiobooks', value: totalItems },
    { label: 'Authors',    value: totalAuthors },
    { label: 'Duration',   value: fmtDuration(totalDuration) },
    { label: 'Size',       value: fmtSize(totalSize) },
  ]

  const active = getActiveFields('audiobookshelf', allFields.map(f => f.label))
  return { type: 'audiobookshelf', fields: allFields.filter(f => active.has(f.label)) }
})
