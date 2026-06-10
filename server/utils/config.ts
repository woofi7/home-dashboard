import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { load as parseYaml, dump as dumpYaml } from 'js-yaml'
import { config as loadDotenv } from 'dotenv'

let envLoaded = false

function loadEnv(configDir: string) {
  if (envLoaded)
    return

  const envPath = join(configDir, '.env')
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false })
  }
  envLoaded = true
}

// Variables that must never be exposed through ${VAR} substitution, even if
// they exist in the environment. Substituted values can be read back through
// public endpoints (e.g. /api/background, /api/config), so the app's own auth
// secrets must not be reachable this way — otherwise a config value like
// "${ADMIN_TOKEN}" would leak the admin token / session key to anonymous users.
const PROTECTED_ENV_VARS = new Set(['ADMIN_TOKEN', 'SESSION_KEY'])

function substituteVars(value: string): string {
  return value.replace(/\$\{([^}]+)}/g, (_, key) => {
    const name = String(key).trim()
    if (PROTECTED_ENV_VARS.has(name)) {
      console.warn(`[config] Refusing to substitute protected variable "${name}"`)
      return ''
    }
    const val = process.env[name]
    if (val === undefined) {
      console.warn(`[config] Environment variable "${name}" is not set; substituting empty string`)
    }
    return val ?? ''
  })
}

function substituteDeep(obj: unknown): unknown {
  if (typeof obj === 'string')
    return substituteVars(obj)

  if (Array.isArray(obj))
    return obj.map(substituteDeep)

  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, substituteDeep(v)])
    )
  }

  return obj
}

function readYaml<T>(filePath: string): T | null {
  if (!existsSync(filePath))
    return null

  try {
    const raw = readFileSync(filePath, 'utf-8')
    return parseYaml(raw) as T
  } catch {
    return null
  }
}

export function getConfigDir(): string {
  return resolve(process.env.CONFIG_DIR || useRuntimeConfig().configDir || './config')
}

export function loadConfig<T>(filename: string): T | null {
  const dir = getConfigDir()
  loadEnv(dir)
  const result = readYaml<T>(join(dir, filename))
  if (result === null)
    return null

  return substituteDeep(result) as T
}

export function loadConfigRaw<T>(filename: string): T | null {
  const dir = getConfigDir()
  loadEnv(dir)
  return readYaml<T>(join(dir, filename))
}

export function writeConfig(filename: string, data: unknown): void {
  const dir = getConfigDir()
  const filePath = join(dir, filename)
  if (existsSync(filePath)) {
    const backupDir = join(dir, 'backup')
    mkdirSync(backupDir, { recursive: true })
    copyFileSync(filePath, join(backupDir, filename + '.bak'))
  }
  writeFileSync(filePath, dumpYaml(data, { lineWidth: -1 }), 'utf-8')
}

export function configFileExists(filename: string): boolean {
  return existsSync(join(getConfigDir(), filename))
}
