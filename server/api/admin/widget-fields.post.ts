import { readFieldConfig, writeFieldConfig } from '../../utils/widget-fields'
import { refreshCache } from '../refresh.get'

export default defineEventHandler(async (event) => {
  const { type, fields } = await readBody(event) as { type: string; fields: string[] }
  if (!type)
    throw createError({ statusCode: 400, message: 'type is required' })

  const config = readFieldConfig()
  config[type] = fields
  writeFieldConfig(config)
  refreshCache.clear()
  return { ok: true }
})
