import { loadConfig } from '../utils/config'
import { createCache } from '../utils/cache'

export type PassEntry = { name: string; count: number }
export type PublicTransitData = { passes: PassEntry[]; url: string }

export const publictransitCache = createCache<PublicTransitData>()
const TTL = 5 * 60 * 1000

export default defineEventHandler(async () => {
  const settings = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  const cfg = (settings.publictransit as Record<string, unknown> | undefined) ?? {}
  const url = cfg.url as string | undefined

  if (!url)
    return null

  const hit = publictransitCache.get()
  if (hit)
    return hit

  const html = await $fetch<string>(url, { responseType: 'text' })
  const passes = parsePasses(html)

  return publictransitCache.set({ passes, url }, TTL)
})

function parsePasses(html: string): PassEntry[] {
  const re = /class="col-md-3">\s*([^<\n]+?)\s*<\/div>[\s\S]{0,400}?class="col-md-3">\s*(\d+)\s+titres?\s+restants?/g
  const results: PassEntry[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim()
    const count = Number(m[2])
    if (name && !Number.isNaN(count))
      results.push({ name, count })
  }
  return results
}
