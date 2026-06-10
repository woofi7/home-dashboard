import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { H3Event } from 'h3'
import { loadConfig, getConfigDir } from './config'

const COOKIE = 'hm_auth'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export function getAdminToken(): string {
  if (process.env.ADMIN_TOKEN)
    return process.env.ADMIN_TOKEN
  const settings = loadConfig<Record<string, unknown>>('settings.yaml')
  return (settings?.adminToken as string) ?? ''
}

export function tokenConfigured(): boolean {
  return !!getAdminToken()
}

let cachedKey: string | null = null

// A random key, independent of the admin token, used to SIGN session cookies.
// Because it never leaves the server, knowing the admin token (e.g. via some
// future leak) is not by itself enough to forge a session cookie. It is
// persisted to the config dir so sessions survive restarts; deleting
// config/session.key — or setting a new SESSION_KEY — revokes every session.
function getSessionKey(): string {
  if (cachedKey)
    return cachedKey
  if (process.env.SESSION_KEY) {
    cachedKey = process.env.SESSION_KEY
    return cachedKey
  }
  try {
    const keyPath = join(getConfigDir(), 'session.key')
    if (existsSync(keyPath)) {
      const existing = readFileSync(keyPath, 'utf-8').trim()
      if (existing) {
        cachedKey = existing
        return cachedKey
      }
    }
    const generated = randomBytes(32).toString('hex')
    writeFileSync(keyPath, generated, { mode: 0o600 })
    cachedKey = generated
    return cachedKey
  } catch {
    // Config dir not writable — fall back to an ephemeral in-memory key.
    // Sessions then reset on restart, which is safe (just less convenient).
    cachedKey = randomBytes(32).toString('hex')
    return cachedKey
  }
}

function sign(payload: string): string {
  return createHmac('sha256', getSessionKey()).update(payload).digest('hex')
}

// Cookie format: "<issuedAtMs>.<hmac of adminToken|issuedAt>". Embedding the
// issue time lets the server enforce an absolute expiry the cookie's own
// maxAge cannot be trusted to provide.
function makeSession(issuedAt: number): string {
  return `${issuedAt}.${sign(`${getAdminToken()}|${issuedAt}`)}`
}

function sessionValid(value: string | undefined): boolean {
  if (!value)
    return false
  const dot = value.indexOf('.')
  if (dot <= 0)
    return false

  const issuedAt = Number(value.slice(0, dot))
  const sig = value.slice(dot + 1)
  if (!Number.isFinite(issuedAt) || issuedAt <= 0)
    return false

  const ageSeconds = (Date.now() - issuedAt) / 1000
  if (ageSeconds < 0 || ageSeconds > SESSION_TTL_SECONDS)
    return false

  const expected = sign(`${getAdminToken()}|${issuedAt}`)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length)
    return false
  return timingSafeEqual(a, b)
}

export function editEnabled(): boolean {
  return tokenConfigured()
}

export function isAuthenticated(event: H3Event): boolean {
  if (!tokenConfigured())
    return false
  return sessionValid(getCookie(event, COOKIE))
}

export function assertAuth(event: H3Event): void {
  if (!isAuthenticated(event)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
}

// Only mark the cookie Secure when the request is actually HTTPS, so a
// plain-HTTP LAN deployment (common for self-hosted) can still log in.
function isSecureRequest(event: H3Event): boolean {
  try {
    // getRequestProtocol is an h3 auto-import in the Nitro runtime.
    // @ts-expect-error global provided by Nitro
    return typeof getRequestProtocol === 'function' && getRequestProtocol(event) === 'https'
  } catch {
    return false
  }
}

export function setAuthCookie(event: H3Event): void {
  setCookie(event, COOKIE, makeSession(Date.now()), {
    httpOnly: true,
    sameSite: 'strict',
    secure: isSecureRequest(event),
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearAuthCookie(event: H3Event): void {
  deleteCookie(event, COOKIE, { path: '/' })
}
