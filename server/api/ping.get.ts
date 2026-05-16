export default defineEventHandler(async (event) => {
  const { url } = getQuery(event) as Record<string, string>
  if (!url) throw createError({ statusCode: 400, message: 'url is required' })

  try {
    await $fetch(url, { method: 'GET', timeout: 4000 })
    return { up: true }
  } catch (e: unknown) {
    // A non-2xx response still means the server is reachable
    const status = (e as { response?: { status?: number } })?.response?.status
    if (status && status < 600) return { up: true }
    return { up: false }
  }
})
