import { assertAuth } from '../../utils/adminAuth'
import { getConfigDir } from '../../utils/config'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MAX_SIZE = 20 * 1024 * 1024

// Detect the real image type from its magic bytes, ignoring the client-supplied
// filename and Content-Type (both spoofable). Returns the safe extension to
// write, or null if the bytes are not a recognised image. This is what stops a
// caller from writing e.g. background-upload.svg / .html into the config dir.
function detectImageExt(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return '.jpg'
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a)
    return '.png'
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString('ascii', 0, 6)))
    return '.gif'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP')
    return '.webp'
  return null
}

export default defineEventHandler(async (event) => {
  assertAuth(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file')

  if (!file || !file.data.length) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }
  if (file.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, message: 'File too large (max 20 MB)' })
  }

  // Choose the on-disk extension from the verified content, never from the
  // request — so the written filename can only ever be one of our image types.
  const ext = detectImageExt(file.data)
  if (!ext) {
    throw createError({ statusCode: 400, message: 'Invalid file type. Allowed: jpg, png, webp, gif' })
  }

  writeFileSync(join(getConfigDir(), `background-upload${ext}`), file.data)

  return { ok: true }
})
