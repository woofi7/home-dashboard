import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE = 'hm_auth'

function sessionToken(): string {
  const secret = process.env.ADMIN_TOKEN
  if (!secret) return ''
  return createHash('sha256').update(secret + ':hm_session').digest('hex')
}

export function editEnabled(): boolean {
  return !!process.env.ADMIN_TOKEN
}

export function isAuthenticated(event: H3Event): boolean {
  if (!editEnabled()) return false
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
