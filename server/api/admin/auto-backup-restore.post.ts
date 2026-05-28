import { copyFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { getConfigDir } from '../../utils/config'

const ALLOWED_EXTENSIONS = new Set(['.yaml', '.yml', '.json', '.env'])

export default defineEventHandler(async (event) => {
  const { filename } = await readBody<{ filename: string }>(event)

  if (!filename || filename.includes('/') || filename.includes('..'))
    throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })

  const safe = basename(filename)
  const dot = safe.lastIndexOf('.')
  const ext = dot === -1 ? '' : safe.slice(dot)
  if (!ALLOWED_EXTENSIONS.has(ext) && safe !== '.env')
    throw createError({ statusCode: 400, statusMessage: 'Invalid file type' })

  const configDir = getConfigDir()
  const backupPath = join(configDir, 'backup', safe + '.bak')

  if (!existsSync(backupPath))
    throw createError({ statusCode: 404, statusMessage: `No backup found for ${safe}` })

  copyFileSync(backupPath, join(configDir, safe))
  return { ok: true, restored: safe }
})
