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
  kind?: 'yaml' | 'dedicated'
}

const DEDICATED_ENTRIES: WidgetEntry[] = [
  { type: 'unraid',         name: 'Unraid',         authType: 'header', endpointCount: 1, displayCount: 6, displayLabels: ['Array','Used','Disks','Parity','CPU','Memory'], yaml: '', kind: 'dedicated' },
  { type: 'portainer',      name: 'Portainer',      authType: 'bearer', endpointCount: 1, displayCount: 6, displayLabels: ['Running','Stopped','Containers','Stacks','Volumes','Images'], yaml: '', kind: 'dedicated' },
  { type: 'duplicati',      name: 'Duplicati',      authType: 'password', endpointCount: 1, displayCount: 5, displayLabels: ['Last backup','Jobs','Active','Source','Dest'], yaml: '', kind: 'dedicated' },
  { type: 'homeassistant',  name: 'Home Assistant', authType: 'bearer', endpointCount: 1, displayCount: 8, displayLabels: ['Entities','Automations','Lights','Switches','Sensors','Climate','Media players','Scenes'], yaml: '', kind: 'dedicated' },
  { type: 'pihole',         name: 'Pi-hole',        authType: 'password', endpointCount: 1, displayCount: 6, displayLabels: ['Queries','Blocked','Forwarded','Cached','Domains','Recent blocked'], yaml: '', kind: 'dedicated' },
  { type: 'qbittorrent',    name: 'qBittorrent',    authType: 'basic',  endpointCount: 1, displayCount: 4, displayLabels: ['DL Speed','UL Speed','Active','Total'], yaml: '', kind: 'dedicated' },
  { type: 'audiobookshelf', name: 'Audiobookshelf', authType: 'bearer', endpointCount: 1, displayCount: 4, displayLabels: ['Audiobooks','Authors','Duration','Size'], yaml: '', kind: 'dedicated' },
]

export default defineEventHandler((): WidgetEntry[] => {
  const configDir = process.env.CONFIG_DIR || './config'
  const customDir = join(resolve(configDir), 'custom-widgets')

  const yamlEntries: WidgetEntry[] = []
  if (existsSync(customDir)) {
    for (const file of readdirSync(customDir)) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue
      const type = file.replace(/\.ya?ml$/, '')
      const yaml = readFileSync(join(customDir, file), 'utf-8')
      try {
        const def = parseYaml(yaml) as Record<string, unknown>
        const display = (def.display as Array<{ label: string }>) || []
        yamlEntries.push({
          type,
          name: (def.name as string) || type,
          authType: (def.auth as Record<string, string>)?.type || 'none',
          endpointCount: Object.keys((def.endpoints as object) || {}).length,
          displayCount: display.length,
          displayLabels: display.map(d => d.label),
          yaml,
          kind: 'yaml',
        })
      } catch {
        yamlEntries.push({ type, name: type, authType: '?', endpointCount: 0, displayCount: 0, displayLabels: [], yaml, kind: 'yaml' })
      }
    }
  }

  const allEntries = [...DEDICATED_ENTRIES, ...yamlEntries]
  return allEntries.sort((a, b) => a.type.localeCompare(b.type))
})
