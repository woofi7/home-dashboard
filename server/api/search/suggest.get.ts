const PROVIDER_URLS: Record<string, string> = {
  google: 'https://suggestqueries.google.com/complete/search?client=firefox&q=',
  duckduckgo: 'https://duckduckgo.com/ac/?type=list&q=',
  bing: 'https://api.bing.com/qsonhs.aspx?type=cb&q=',
  baidu: 'https://suggestion.baidu.com/su?wd=',
}

export default defineEventHandler(async (event) => {
  const { q, provider = 'duckduckgo' } = getQuery(event) as { q: string; provider?: string }
  if (!q)
    return []

  const baseUrl = PROVIDER_URLS[provider]
  if (!baseUrl)
    return []

  try {
    const data = await $fetch<unknown[]>(baseUrl + encodeURIComponent(q))
    if (Array.isArray(data) && Array.isArray(data[1]))
      return data[1]
    return []
  } catch {
    return []
  }
})
