import { execSync } from 'node:child_process'

export function getVersion(): string {
  if (process.env.APP_VERSION)
    return process.env.APP_VERSION.trim()
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim()
  } catch {
    return 'dev'
  }
}
