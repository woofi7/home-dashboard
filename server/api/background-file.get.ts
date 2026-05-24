import { getConfigDir } from '../utils/config'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', gif: 'image/gif',
}

export default defineEventHandler((event) => {
  const dir = getConfigDir()
  for (const ext of EXTS) {
    const path = join(dir, `background-upload.${ext}`)
    if (existsSync(path)) {
      setResponseHeader(event, 'Content-Type', MIME[ext]!)
      setResponseHeader(event, 'Cache-Control', 'no-cache')
      return readFileSync(path)
    }
  }
  throw createError({ statusCode: 404, message: 'No uploaded background found' })
})
