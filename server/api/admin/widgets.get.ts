import { WIDGET_METAS } from '../../utils/widgetRegistry'

export type WidgetEntry = { type: string; name: string; authType: string; displayLabels: string[] }

export default defineEventHandler((): WidgetEntry[] =>
  Object.entries(WIDGET_METAS)
    .map(([type, m]) => ({ type, name: m.name, authType: m.authType, displayLabels: [...m.displayLabels] }))
    .sort((a, b) => a.type.localeCompare(b.type))
)
