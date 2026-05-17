/** Derives the suggested env var name for a widget credential field. */
export function envVarName(type: string, field: 'apiKey' | 'username' | 'password'): string {
  const prefix = type.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
  const suffix = field === 'apiKey' ? 'API_KEY' : field.toUpperCase()
  return `${prefix}_${suffix}`
}

/** Returns the variable name if value is a ${VAR} reference, otherwise null. */
export function parseEnvRef(value: unknown): string | null {
  if (typeof value !== 'string')
    return null
  const m = value.match(/^\$\{([^}]+)\}$/)
  return m ? m[1] : null
}
