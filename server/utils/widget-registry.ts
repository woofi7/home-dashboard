import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { load as parseYaml } from 'js-yaml'
import { createCache } from './cache'

export type WidgetAuth =
  | { type: 'header'; header: string; field: string }
  | { type: 'bearer'; field: string }
  | { type: 'basic'; usernameField: string; passwordField: string }
  | { type: 'query'; param: string; field: string }
  | { type: 'none' }

export type WidgetEndpoint = { path: string; method?: string; headers?: Record<string, string>; body?: unknown; responseKey?: string }

export type WidgetDisplay = { label: string; value: string; suffix?: string; format?: 'bytes' | 'bytes/s' }

export type WidgetDef = {
  name: string
  auth: WidgetAuth
  endpoints: Record<string, WidgetEndpoint>
  display: WidgetDisplay[]
}

function loadRegistry(): Map<string, WidgetDef> {
  const map = new Map<string, WidgetDef>()
  const configDir = process.env.CONFIG_DIR || './config'
  const customDir = join(resolve(configDir), 'custom-widgets')
  if (!existsSync(customDir)) return map
  for (const file of readdirSync(customDir)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue
    const type = file.replace(/\.ya?ml$/, '')
    try {
      const def = parseYaml(readFileSync(join(customDir, file), 'utf-8')) as WidgetDef
      map.set(type, def)
    } catch (err) {
      console.error(`[widget-registry] Failed to parse ${file}:`, err)
    }
  }
  return map
}

const cache = createCache<Map<string, WidgetDef>>()
const TTL = 5 * 60 * 1000

export function getWidgetDef(type: string): WidgetDef | undefined {
  const registry = cache.get(TTL) ?? cache.set(loadRegistry())
  return registry.get(type)
}

export function clearWidgetRegistryCache(): void {
  cache.clear()
}
