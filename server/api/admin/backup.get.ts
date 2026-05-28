import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import { getConfigDir } from '../../utils/config'

const ALLOWED_EXTENSIONS = new Set(['.yaml', '.yml', '.json', '.env'])
const EXCLUDED_DIRS = new Set(['tmp', 'backup'])

export default defineEventHandler((event) => {
  const configDir = getConfigDir()

  if (!existsSync(configDir)) {
    throw createError({ statusCode: 500, statusMessage: 'Config directory not found' })
  }

  const files: Record<string, Uint8Array> = {}

  for (const entry of readdirSync(configDir, { withFileTypes: true })) {
    if (entry.isDirectory() || EXCLUDED_DIRS.has(entry.name))
      continue

    const ext = extname(entry.name)
    if (!ALLOWED_EXTENSIONS.has(ext) && entry.name !== '.env')
      continue

    // Skip .bak files - they are internal recovery files
    if (entry.name.endsWith('.bak'))
      continue

    try {
      const content = readFileSync(join(configDir, entry.name), 'utf-8')
      files[entry.name] = strToU8(content)
    }
    catch {
      // Skip unreadable files
    }
  }

  const zip = zipSync(files, { level: 6 })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `homepage-backup-${timestamp}.zip`

  setHeader(event, 'Content-Type', 'application/zip')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  setHeader(event, 'Content-Length', zip.byteLength.toString())

  return zip
})
