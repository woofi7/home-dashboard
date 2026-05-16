import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { load as parseYaml, dump as dumpYaml } from 'js-yaml'

type FieldConfig = Record<string, string[]>

function filePath() {
  return join(resolve(process.env.CONFIG_DIR ?? './config'), 'widget-fields.yaml')
}

export function readFieldConfig(): FieldConfig {
  const p = filePath()
  if (!existsSync(p)) return {}
  return (parseYaml(readFileSync(p, 'utf-8')) as FieldConfig) ?? {}
}

export function writeFieldConfig(config: FieldConfig): void {
  writeFileSync(filePath(), dumpYaml(config), 'utf-8')
}

export function getActiveFields(type: string, allLabels: string[]): Set<string> {
  const saved = readFieldConfig()[type]
  return new Set(saved ?? allLabels)
}
