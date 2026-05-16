import { describe, it, expect } from 'vitest'
import { buildAuthHeaders, buildAuthQuery } from '../server/utils/auth'

describe('buildAuthHeaders', () => {
  it('returns empty object for type none', () => {
    expect(buildAuthHeaders({ type: 'none' }, {})).toEqual({})
  })

  it('returns empty object when credential is missing', () => {
    expect(buildAuthHeaders({ type: 'bearer', field: 'token' }, {})).toEqual({})
  })

  it('builds a Bearer token header', () => {
    const h = buildAuthHeaders({ type: 'bearer', field: 'token' }, { token: 'abc123' })
    expect(h['Authorization']).toBe('Bearer abc123')
  })

  it('builds a Basic auth header', () => {
    const h = buildAuthHeaders(
      { type: 'basic', usernameField: 'username', passwordField: 'password' },
      { username: 'user', password: 'pass' },
    )
    expect(h['Authorization']).toBe(`Basic ${Buffer.from('user:pass').toString('base64')}`)
  })

  it('builds a custom header', () => {
    const h = buildAuthHeaders(
      { type: 'header', header: 'X-Api-Key', field: 'apiKey' },
      { apiKey: 'secret' },
    )
    expect(h['X-Api-Key']).toBe('secret')
  })

  it('skips header when field value is empty', () => {
    const h = buildAuthHeaders({ type: 'header', header: 'X-Api-Key', field: 'apiKey' }, { apiKey: '' })
    expect(h['X-Api-Key']).toBeUndefined()
  })
})

describe('buildAuthQuery', () => {
  it('returns empty object for non-query auth types', () => {
    expect(buildAuthQuery({ type: 'bearer', field: 'token' }, { token: 'x' })).toEqual({})
  })

  it('builds a query param', () => {
    const p = buildAuthQuery(
      { type: 'query', param: 'api_key', field: 'apiKey' },
      { apiKey: 'mykey' },
    )
    expect(p['api_key']).toBe('mykey')
  })
})
