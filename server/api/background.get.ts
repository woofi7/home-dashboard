import { loadConfig } from '../utils/config'
import { createCache } from '../utils/cache'

type CachedBg = { thumb: string; full: string; author: string; authorLink: string }

const cache = createCache<CachedBg>()

function msUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return midnight.getTime() - now.getTime()
}

export default defineEventHandler(async () => {
  const settings = loadConfig<Record<string, unknown>>('settings.yaml')
  const bg = settings?.background as Record<string, string> | undefined

  if (!bg || bg.provider !== 'unsplash')
    return null

  const apiKey = bg.unsplashApiKey
  if (!apiKey)
    throw createError({ statusCode: 400, message: 'unsplashApiKey not set in settings.yaml' })

  const hit = cache.get()
  if (hit)
    return hit

  const query = bg.query || 'nature landscape'
  const data = await $fetch<{ urls: { full: string; regular: string }; user: { name: string }; links: { html: string } }>(
    `https://api.unsplash.com/photos/random?orientation=landscape&query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Client-ID ${apiKey}` } }
  )

  return cache.set({
    thumb: data.urls.regular,
    full: data.urls.full,
    author: data.user.name,
    authorLink: data.links.html,
  }, msUntilMidnight())
})
