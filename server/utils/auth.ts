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
export type HttpHeaders = Record<string, string>
