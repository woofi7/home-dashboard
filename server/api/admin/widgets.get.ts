import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { load as parseYaml } from 'js-yaml'

export type WidgetEntry = {
  type: string
  name: string
  authType: string
  endpointCount: number
  displayCount: number
  displayLabels: string[]
  yaml: string
}

export default defineEventHandler((): WidgetEntry[] => {
  const configDir = process.env.CONFIG_DIR || './config'
  const customDir = join(resolve(configDir), 'custom-widgets')

  if (!existsSync(customDir)) return []

  const entries: WidgetEntry[] = []
  for (const file of readdirSync(customDir)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue
    const type = file.replace(/\.ya?ml$/, '')
    const yaml = readFileSync(join(customDir, file), 'utf-8')
    try {
      const def = parseYaml(yaml) as Record<string, unknown>
      const display = (def.display as Array<{ label: string }>) || []
      entries.push({
        type,
        name: (def.name as string) || type,
        authType: (def.auth as Record<string, string>)?.type || 'none',
        endpointCount: Object.keys((def.endpoints as object) || {}).length,
        displayCount: display.length,
        displayLabels: display.map(d => d.label),
        yaml,
      })
    } catch {
      entries.push({ type, name: type, authType: '?', endpointCount: 0, displayCount: 0, displayLabels: [], yaml })
    }
  }

  return entries.sort((a, b) => a.type.localeCompare(b.type))
})
