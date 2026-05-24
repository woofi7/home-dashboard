import { assertAuth } from '../../utils/adminAuth'
import { getConfigDir } from '../../utils/config'
import { writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_SIZE = 20 * 1024 * 1024

export default defineEventHandler(async (event) => {
  assertAuth(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file')

  if (!file || !file.data.length) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }
  if (!ALLOWED_TYPES.has(file.type ?? '')) {
    throw createError({ statusCode: 400, message: 'Invalid file type. Allowed: jpg, png, webp, gif' })
  }
  if (file.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, message: 'File too large (max 20 MB)' })
  }

  const ext = extname(file.filename ?? '') || '.jpg'
  const dir = getConfigDir()
  writeFileSync(join(dir, `background-upload${ext}`), file.data)

  return { ok: true }
})
