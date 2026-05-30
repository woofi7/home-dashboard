import { widgetEndpoint } from '../../utils/widgetError'
import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'
import { formatBytes, formatDuration } from '../../utils/formatBytes'

import definition from '#shared/widgetDefinitions/audiobookshelf'
export const meta = definition


export async function fetchAudiobookshelf(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey)
    return null

  const base = url.replace(/\/$/, '')
  const headers = { Authorization: `Bearer ${apiKey}` }

  const { libraries } = await $fetch<{ libraries: Array<{ id: string; mediaType: string }> }>(`${base}/api/libraries`, { headers })
  const bookLibs = libraries.filter(l => l.mediaType === 'book')

  const stats = await Promise.all(
    bookLibs.map(l =>
      $fetch<{ totalItems: number; totalAuthors: number; totalSize: number; totalDuration: number }>(
        `${base}/api/libraries/${l.id}/stats`, { headers },
      ),
    ),
  )

  const allFields = [
    { label: 'Audiobooks', value: stats.reduce((s, r) => s + r.totalItems, 0) },
    { label: 'Authors',    value: stats.reduce((s, r) => s + r.totalAuthors, 0) },
    { label: 'Duration',   value: formatDuration(stats.reduce((s, r) => s + r.totalDuration, 0)) },
    { label: 'Size',       value: formatBytes(stats.reduce((s, r) => s + r.totalSize, 0)) },
  ]

  return { type: 'audiobookshelf', fields: getOrderedActiveFields('audiobookshelf', allFields) }
}

export { fetchAudiobookshelf as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchAudiobookshelf, ['url', 'apiKey']))
