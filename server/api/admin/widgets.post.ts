import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { load as parseYaml } from 'js-yaml'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ type: string; yaml: string; delete?: boolean }>(event)
  if (!body.type) throw createError({ statusCode: 400, message: 'type is required' })

  const configDir = process.env.CONFIG_DIR || './config'
  const customDir = join(resolve(configDir), 'custom-widgets')

  if (body.delete) {
    const path = join(customDir, `${body.type}.yaml`)
    if (existsSync(path)) unlinkSync(path)
    return { ok: true }
  }

  if (!body.yaml) throw createError({ statusCode: 400, message: 'yaml is required' })

  try {
    parseYaml(body.yaml)
  } catch (e: unknown) {
    throw createError({ statusCode: 400, message: `Invalid YAML: ${(e as Error).message}` })
  }

  mkdirSync(customDir, { recursive: true })
  writeFileSync(join(customDir, `${body.type}.yaml`), body.yaml, 'utf-8')

  return { ok: true }
})
