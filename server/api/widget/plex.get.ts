import { getOrderedActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

import definition from '#shared/widgetDefinitions/plex'
export const meta = definition

type PlexContainer = { MediaContainer: { size: number } }


export async function fetchPlex(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey)
    return null

  const base = url.replace(/\/$/, '')
  const headers = { Accept: 'application/json' }
  const token = `X-Plex-Token=${encodeURIComponent(apiKey)}`

  const [movies, shows, streams] = await Promise.all([
    $fetch<PlexContainer>(`${base}/library/sections/1/all?${token}`, { headers }),
    $fetch<PlexContainer>(`${base}/library/sections/2/all?${token}`, { headers }),
    $fetch<PlexContainer>(`${base}/status/sessions?${token}`, { headers }),
  ])

  const allFields = [
    { label: 'Movies',  value: movies.MediaContainer.size },
    { label: 'Shows',   value: shows.MediaContainer.size },
    { label: 'Streams', value: streams.MediaContainer.size },
  ]

  return { type: 'plex', fields: getOrderedActiveFields('plex', allFields) }
}

export { fetchPlex as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey)
    throw createError({ statusCode: 400, message: 'apiKey is required' })
  return fetchPlex(creds)
})
