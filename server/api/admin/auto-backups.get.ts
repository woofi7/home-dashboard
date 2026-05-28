import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigDir } from '../../utils/config'

export default defineEventHandler(() => {
  const backupDir = join(getConfigDir(), 'backup')

  if (!existsSync(backupDir))
    return { files: [] }

  const files = readdirSync(backupDir, { withFileTypes: true })
    .filter(e => !e.isDirectory() && e.name.endsWith('.bak'))
    .map((e) => {
      const stat = statSync(join(backupDir, e.name))
      return {
        name: e.name.slice(0, -4),
        modified: stat.mtime.toISOString(),
        size: stat.size,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return { files }
})
