export default defineEventHandler((event) => {
  const allowed = process.env.ALLOWED_HOSTS || useRuntimeConfig().allowedHosts || '*'
  if (allowed === '*')
    return

  const host = getRequestHeader(event, 'host')?.split(':')[0] ?? ''
  const allowedList = allowed.split(',').map((h: string) => h.trim())

  if (!allowedList.includes(host)) {
    throw createError({ statusCode: 403, message: 'Host not allowed' })
  }
})
