import { writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { getConfigDir } from '../../utils/config'

const ALLOWED_EXTENSIONS = new Set(['.yaml', '.yml', '.json', '.env'])

function allowedFilename(name: string): boolean {
  if (name.includes('/') || name.includes('..'))
    return false
  const dot = name.lastIndexOf('.')
  const ext = dot === -1 ? name : name.slice(dot)
  return ALLOWED_EXTENSIONS.has(ext) || name === '.env'
}

export default defineEventHandler(async (event) => {
  const formData = await readFormData(event)
  const file = formData.get('file') as File | null

  if (!file) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const buffer = await file.arrayBuffer()
  const zip = new Uint8Array(buffer)

  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(zip)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or corrupt zip file' })
  }

  const allowed = Object.keys(entries).filter(name => allowedFilename(basename(name)))

  if (!allowed.length) {
    throw createError({ statusCode: 400, statusMessage: 'Zip contains no valid config files' })
  }

  const configDir = getConfigDir()
  const restored: string[] = []

  for (const name of allowed) {
    const safe = basename(name)
    const dest = join(configDir, safe)

    // Backup existing file before overwriting
    if (existsSync(dest)) {
      copyFileSync(dest, dest + '.bak')
    }

    writeFileSync(dest, strFromU8(entries[name]!), 'utf-8')
    restored.push(safe)
  }

  return { ok: true, restored }
})
