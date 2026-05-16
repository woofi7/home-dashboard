export default defineEventHandler(async (event) => {
  const { url } = getQuery(event) as { url: string }
  if (!url) throw createError({ statusCode: 400, message: 'url is required' })

  const start = Date.now()
  try {
    await $fetch(url, { method: 'GET', timeout: 5000 })
    return { ok: true, latency: Date.now() - start }
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    return { ok: false, latency: Date.now() - start, status }
  }
})
