import { describe, it, expect } from 'vitest'
import { fuzzyMatch } from '../app/utils/fuzzy'

describe('fuzzyMatch - substring scoring', () => {
  it('scores an exact (case-insensitive) match highest', () => {
    expect(fuzzyMatch('Sonarr', 'sonarr')!.score).toBe(1000)
  })

  it('scores a prefix match above a mid-string substring', () => {
    const prefix = fuzzyMatch('Sonarr', 'son')!.score
    const mid = fuzzyMatch('Sonarr', 'arr')!.score
    expect(prefix).toBe(500)
    expect(mid).toBe(200)
    expect(prefix).toBeGreaterThan(mid)
  })
})

describe('fuzzyMatch - segments', () => {
  it('highlights only the matched substring in the middle', () => {
    expect(fuzzyMatch('Sonarr', 'nar')!.segments).toEqual([
      { text: 'So', highlight: false },
      { text: 'nar', highlight: true },
      { text: 'r', highlight: false },
    ])
  })

  it('omits the leading segment when the match is at the start', () => {
    expect(fuzzyMatch('Sonarr', 'son')!.segments).toEqual([
      { text: 'Son', highlight: true },
      { text: 'arr', highlight: false },
    ])
  })

  it('omits the trailing segment when the match is at the end', () => {
    expect(fuzzyMatch('Sonarr', 'arr')!.segments).toEqual([
      { text: 'Son', highlight: false },
      { text: 'arr', highlight: true },
    ])
  })

  it('preserves original casing in segment text', () => {
    expect(fuzzyMatch('Sonarr', 'SON')!.segments[0]).toEqual({ text: 'Son', highlight: true })
  })
})

describe('fuzzyMatch - subsequence matching', () => {
  it('matches non-contiguous characters in order', () => {
    const res = fuzzyMatch('Sonarr', 'snr')
    expect(res).not.toBeNull()
    expect(res!.segments.filter(s => s.highlight).map(s => s.text)).toEqual(['S', 'n', 'r'])
  })

  it('rewards consecutive characters with a higher score', () => {
    const consecutive = fuzzyMatch('abcxyz', 'abc')!.score
    const scattered = fuzzyMatch('axbycz', 'abc')!.score
    expect(consecutive).toBeGreaterThan(scattered)
  })

  it('returns null when characters are out of order', () => {
    expect(fuzzyMatch('Sonarr', 'rns')).toBeNull()
  })

  it('returns null when a query character is absent', () => {
    expect(fuzzyMatch('Sonarr', 'sonz')).toBeNull()
  })
})
