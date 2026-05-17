import type { WidgetDefinition } from '#shared/widgetDefinitions/types'

const modules = import.meta.glob(
  ['../../shared/widgetDefinitions/*.ts', '!../../shared/widgetDefinitions/types.ts', '!../../shared/widgetDefinitions/index.ts'],
  { eager: true, import: 'default' },
)

export const widgetDefinitions: Record<string, WidgetDefinition> = Object.fromEntries(
  Object.entries(modules).map(([path, def]) => {
    const type = path.match(/([^/]+)\.ts$/)?.[1] ?? ''
    return [type, def as WidgetDefinition]
  }),
)
