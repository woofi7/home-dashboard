import type { WidgetDefinition } from '#shared/widgetDefinitions/types'

const modules = import.meta.glob('/shared/widgetDefinitions/*.ts', { eager: true, import: 'default' })

export const widgetDefinitions: Record<string, WidgetDefinition> = Object.fromEntries(
  Object.entries(modules)
    .filter(([path]) => !path.endsWith('types.ts'))
    .map(([path, def]) => {
      const type = path.match(/([^/]+)\.ts$/)?.[1] ?? ''
      return [type, def as WidgetDefinition]
    }),
)
