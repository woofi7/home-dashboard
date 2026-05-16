type Quote = { text: string; author: string; day: string }
let cache: Quote | null = null

function today() { return new Date().toISOString().slice(0, 10) }

export default defineEventHandler(async () => {
  if (cache && cache.day === today()) return cache

  const data = await $fetch<Array<{ q: string; a: string }>>('https://zenquotes.io/api/today')
  const { q, a } = data[0]

  cache = { text: q, author: a, day: today() }
  return cache
})
