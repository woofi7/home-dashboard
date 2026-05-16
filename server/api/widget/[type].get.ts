import { getWidgetDef } from '../../utils/widget-registry'
import { fetchWidget } from '../../utils/fetchWidget'

export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')!
  const query = getQuery(event) as Record<string, string>

  if (!query.url) throw createError({ statusCode: 400, message: 'url is required' })
  if (!getWidgetDef(type)) throw createError({ statusCode: 404, message: `Unknown widget type: ${type}` })

  const result = await fetchWidget(type, query)
  if (!result) throw createError({ statusCode: 500, message: 'Widget fetch failed' })
  return { type, ...result }
})
