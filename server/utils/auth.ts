export type AuthConfig = {
  type: 'none' | 'header' | 'bearer' | 'basic' | 'query' | 'cookie' | 'login'
  header?: string
  field?: string
  usernameField?: string
  passwordField?: string
  queryParam?: string
  param?: string
  loginPath?: string
  cookieName?: string
}

export type ServiceCredentials = Record<string, string>

export function buildAuthHeaders(
  auth: AuthConfig,
  credentials: ServiceCredentials
): Record<string, string> {
  const headers: Record<string, string> = {}

  switch (auth.type) {
    case 'header': {
      const value = credentials[auth.field ?? 'apiKey']
      if (value && auth.header) headers[auth.header] = value
      break
    }
    case 'bearer': {
      const token = credentials[auth.field ?? 'token']
      if (token) headers['Authorization'] = `Bearer ${token}`
      break
    }
    case 'basic': {
      const username = credentials[auth.usernameField ?? 'username']
      const password = credentials[auth.passwordField ?? 'password']
      if (username && password) {
        const encoded = Buffer.from(`${username}:${password}`).toString('base64')
        headers['Authorization'] = `Basic ${encoded}`
      }
      break
    }
  }

  return headers
}

export function buildAuthQuery(
  auth: AuthConfig,
  credentials: ServiceCredentials
): Record<string, string> {
  const params: Record<string, string> = {}

  if (auth.type === 'query') {
    const value = credentials[(auth as { field?: string }).field ?? 'apiKey']
    const paramName = (auth as { queryParam?: string; param?: string }).queryParam ?? (auth as { param?: string }).param
    if (value && paramName) params[paramName] = value
  }

  return params
}
