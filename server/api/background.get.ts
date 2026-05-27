import { loadConfig } from '../utils/config'
import { createCache } from '../utils/cache'

type CachedBg = { thumb: string; full: string; author?: string; authorLink?: string; source?: string }

export const unsplashCache = createCache<CachedBg>()
export const pexelsCache = createCache<CachedBg>()
export const pixabayCache = createCache<CachedBg>()

function msUntilMidnight(tz: string): number {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(now)
  const h = Number(parts.find(p => p.type === 'hour')!.value)
  const min = Number(parts.find(p => p.type === 'minute')!.value)
  const sec = Number(parts.find(p => p.type === 'second')!.value)
  return (24 * 3600 - h * 3600 - min * 60 - sec) * 1000
}

function todayDateStr(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
}

function dailyPage(tz: string): number {
  const [y, m, d] = todayDateStr(tz).split('-').map(Number)
  const daysSinceEpoch = Math.floor(Date.UTC(y, m - 1, d) / (24 * 60 * 60 * 1000))
  return (daysSinceEpoch % 50) + 1
}

export default defineEventHandler(async () => {
  const settings = loadConfig<Record<string, unknown>>('settings.yaml')
  const bg = settings?.background as Record<string, unknown> | undefined
  const tz = (settings?.timezone as string | undefined) || Intl.DateTimeFormat().resolvedOptions().timeZone

  if (!bg)
    return null

  const provider = (bg.provider as string) || 'none'

  if (provider === 'none')
    return null

  if (provider === 'url') {
    const url = bg.url as string
    if (!url)
      return null
    return { thumb: url, full: url }
  }

  if (provider === 'upload')
    return { thumb: '/api/background-file', full: '/api/background-file' }

  if (provider === 'picsum') {
    const date = todayDateStr(tz)
    return {
      thumb: `https://picsum.photos/seed/${date}/1200/675`,
      full: `https://picsum.photos/seed/${date}/1920/1080`,
    }
  }

  if (provider === 'unsplash') {
    const apiKey = bg.unsplashApiKey as string
    if (!apiKey)
      throw createError({ statusCode: 400, message: 'unsplashApiKey not set in settings.yaml' })

    const hit = unsplashCache.get()
    if (hit)
      return hit

    const query = (bg.query as string) || 'nature landscape'
    const data = await $fetch<{ urls: { full: string; regular: string }; user: { name: string }; links: { html: string } }>(
      `https://api.unsplash.com/photos/random?orientation=landscape&query=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Client-ID ${apiKey}` } },
    )

    return unsplashCache.set({
      thumb: data.urls.regular,
      full: data.urls.full,
      author: data.user.name,
      authorLink: data.links.html,
      source: 'Unsplash',
    }, msUntilMidnight(tz))
  }

  if (provider === 'pexels') {
    const apiKey = bg.pexelsApiKey as string
    if (!apiKey)
      throw createError({ statusCode: 400, message: 'pexelsApiKey not set in settings.yaml' })

    const cached = pexelsCache.get()
    if (cached)
      return cached

    const query = (bg.query as string) || 'nature landscape'
    const data = await $fetch<{ photos: Array<{ src: { large2x: string; medium: string }; photographer: string; url: string }> }>(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&page=${dailyPage(tz)}`,
      { headers: { Authorization: apiKey } },
    )

    const photo = data.photos[0]
    if (!photo)
      return null

    return pexelsCache.set({
      thumb: photo.src.medium,
      full: photo.src.large2x,
      author: photo.photographer,
      authorLink: photo.url,
      source: 'Pexels',
    }, msUntilMidnight(tz))
  }

  if (provider === 'pixabay') {
    const apiKey = bg.pixabayApiKey as string
    if (!apiKey)
      throw createError({ statusCode: 400, message: 'pixabayApiKey not set in settings.yaml' })

    const cached = pixabayCache.get()
    if (cached)
      return cached

    const query = (bg.query as string) || 'nature landscape'
    const data = await $fetch<{ hits: Array<{ largeImageURL: string; webformatURL: string; user: string; pageURL: string }> }>(
      `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3&page=${dailyPage(tz)}`,
    )

    const photo = data.hits[0]
    if (!photo)
      return null

    return pixabayCache.set({
      thumb: photo.webformatURL,
      full: photo.largeImageURL,
      author: photo.user,
      authorLink: photo.pageURL,
      source: 'Pixabay',
    }, msUntilMidnight(tz))
  }

  return null
})
