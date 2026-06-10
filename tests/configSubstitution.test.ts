import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let dir: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'hm-cfg-'))
  // CONFIG_DIR is checked before useRuntimeConfig(), so loadConfig reads here.
  process.env.CONFIG_DIR = dir
  process.env.MY_PUBLIC_VAR = 'public-value'
  process.env.ADMIN_TOKEN = 'super-secret-admin'
  process.env.SESSION_KEY = 'super-secret-session'
  writeFileSync(join(dir, 'demo.yaml'), 'a: ${MY_PUBLIC_VAR}\nb: ${ADMIN_TOKEN}\nc: ${SESSION_KEY}\n')
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
  delete process.env.CONFIG_DIR
  delete process.env.MY_PUBLIC_VAR
  delete process.env.ADMIN_TOKEN
  delete process.env.SESSION_KEY
})

import { loadConfig } from '../server/utils/config'

describe('config ${VAR} substitution', () => {
  it('substitutes ordinary environment variables', () => {
    const cfg = loadConfig<Record<string, string>>('demo.yaml')!
    expect(cfg.a).toBe('public-value')
  })

  it('refuses to substitute the protected admin token / session key', () => {
    const cfg = loadConfig<Record<string, string>>('demo.yaml')!
    expect(cfg.b).toBe('')
    expect(cfg.c).toBe('')
  })
})
