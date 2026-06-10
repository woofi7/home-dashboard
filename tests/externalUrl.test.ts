import { describe, it, expect } from 'vitest'
import { externalUrl, fetchCandidates } from '../shared/externalUrl'

describe('externalUrl', () => {
  it('leaves http URLs untouched', () => {
    expect(externalUrl('http://sonarr')).toBe('http://sonarr')
  })

  it('leaves https URLs untouched', () => {
    expect(externalUrl('https://example.com/path')).toBe('https://example.com/path')
  })

  it('prepends http:// to a bare hostname', () => {
    expect(externalUrl('google.com')).toBe('http://google.com')
  })

  it('prepends http:// to a host:port without scheme', () => {
    expect(externalUrl('10.0.1.2:8200')).toBe('http://10.0.1.2:8200')
  })

  it('prepends http:// to a hostname:port that looks like a scheme', () => {
    expect(externalUrl('nas:8200')).toBe('http://nas:8200')
  })

  it('keeps protocol-relative URLs', () => {
    expect(externalUrl('//cdn.example.com')).toBe('//cdn.example.com')
  })

  it('keeps other explicit schemes', () => {
    expect(externalUrl('ftp://files.example.com')).toBe('ftp://files.example.com')
    expect(externalUrl('mailto:me@example.com')).toBe('mailto:me@example.com')
  })

  it('trims surrounding whitespace before normalizing', () => {
    expect(externalUrl('  example.com  ')).toBe('http://example.com')
  })

  it('neutralizes a javascript: URL', () => {
    expect(externalUrl('javascript:alert(1)')).toBe('#')
  })

  it('neutralizes the javascript:// comment-trick bypass', () => {
    expect(externalUrl('javascript://%0aalert(document.cookie)')).toBe('#')
    expect(externalUrl('JavaScript://comment%0Aalert(1)')).toBe('#')
  })

  it('neutralizes data: and vbscript: URLs', () => {
    expect(externalUrl('data:text/html,<script>alert(1)</script>')).toBe('#')
    expect(externalUrl('vbscript:msgbox(1)')).toBe('#')
  })

  it('neutralizes javascript: hidden behind embedded control characters', () => {
    expect(externalUrl('java\tscript:alert(1)')).toBe('#')
    expect(externalUrl('java\nscript:alert(1)')).toBe('#')
  })
})

describe('fetchCandidates', () => {
  it('tries https before http for a scheme-less URL', () => {
    expect(fetchCandidates('status.woofi7.com')).toEqual(['https://status.woofi7.com', 'http://status.woofi7.com'])
  })

  it('tries https before http for a scheme-less host:port', () => {
    expect(fetchCandidates('10.0.1.2:8200')).toEqual(['https://10.0.1.2:8200', 'http://10.0.1.2:8200'])
  })

  it('respects an explicit http scheme (no https attempt)', () => {
    expect(fetchCandidates('http://10.0.1.2:8200')).toEqual(['http://10.0.1.2:8200'])
  })

  it('respects an explicit https scheme', () => {
    expect(fetchCandidates('https://status.woofi7.com')).toEqual(['https://status.woofi7.com'])
  })
})
