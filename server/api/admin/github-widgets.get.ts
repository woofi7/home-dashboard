const GH_BASE = 'https://api.github.com/repos/gethomepage/homepage/contents'
const GH_HEADERS = { Accept: 'application/vnd.github.v3+json' }

let cache: { types: string[]; at: number } | null = null
const TTL = 5 * 60 * 1000

export default defineEventHandler(async (): Promise<{ types: string[] }> => {
  if (cache && Date.now() - cache.at < TTL) return { types: cache.types }

  const entries = await $fetch<Array<{ name: string; type: string }>>(
    `${GH_BASE}/src/widgets`,
    { headers: GH_HEADERS },
  )

  const types = entries
    .filter((e) => e.type === 'dir')
    .map((e) => e.name)
    .sort()

  cache = { types, at: Date.now() }
  return { types }
})
