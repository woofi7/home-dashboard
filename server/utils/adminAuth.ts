import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { loadConfig } from './config'

const COOKIE = 'hm_auth'

export function getAdminToken(): string {
  if (process.env.ADMIN_TOKEN)
    return process.env.ADMIN_TOKEN
  const settings = loadConfig<Record<string, unknown>>('settings.yaml')
  return (settings?.adminToken as string) ?? ''
}

export function tokenConfigured(): boolean {
  return !!getAdminToken()
}

function sessionToken(): string {
  const secret = getAdminToken()
  if (!secret)
    return ''
  return createHash('sha256').update(secret + ':hm_session').digest('hex')
}

export function editEnabled(): boolean {
  return tokenConfigured()
}

export function isAuthenticated(event: H3Event): boolean {
  if (!tokenConfigured())
    return false
  return getCookie(event, COOKIE) === sessionToken()
}

export function assertAuth(event: H3Event): void {
  if (!isAuthenticated(event)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
}

export function setAuthCookie(event: H3Event): void {
  setCookie(event, COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearAuthCookie(event: H3Event): void {
  deleteCookie(event, COOKIE, { path: '/' })
}
