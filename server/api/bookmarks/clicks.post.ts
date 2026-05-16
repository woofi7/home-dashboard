import { loadConfig, writeConfig } from '../../utils/config'

export default defineEventHandler(async (event) => {
  const { name } = await readBody<{ name: string }>(event)
  if (!name) throw createError({ statusCode: 400, message: 'name is required' })

  const clicks = loadConfig<Record<string, number>>('bookmark-clicks.yaml') ?? {}
  clicks[name] = (clicks[name] ?? 0) + 1
  writeConfig('bookmark-clicks.yaml', clicks)

  return { ok: true, count: clicks[name] }
})
