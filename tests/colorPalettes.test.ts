import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { COLOR_PALETTES, applyPalette, getPaletteById } from '../app/utils/colorPalettes'
import type { ColorPalette } from '../app/utils/colorPalettes'

// ── getPaletteById ────────────────────────────────────────────────────────────

describe('getPaletteById', () => {
  it('returns the matching palette by id', () => {
    for (const palette of COLOR_PALETTES.filter(p => p.id !== 'custom')) {
      expect(getPaletteById(palette.id)).toBe(palette)
    }
  })

  it('returns a custom palette object for the custom id', () => {
    const result = getPaletteById('custom')
    expect(result.id).toBe('custom')
    expect(result.name).toBe('Custom')
  })

  it('merges provided custom colors when id is custom', () => {
    const result = getPaletteById('custom', { accent: '#ff0000' })
    expect(result.accent).toBe('#ff0000')
  })

  it('returns the first palette (indigo) for unknown ids', () => {
    expect(getPaletteById('unknown')).toBe(COLOR_PALETTES[0])
  })

  it('returns indigo for empty string', () => {
    expect(getPaletteById('')).toBe(COLOR_PALETTES[0])
  })
})

// ── COLOR_PALETTES catalog ────────────────────────────────────────────────────

describe('COLOR_PALETTES', () => {
  it('contains exactly 6 palettes', () => {
    expect(COLOR_PALETTES).toHaveLength(6)
  })

  it('includes indigo, violet, sky, emerald, rose, custom', () => {
    const ids = COLOR_PALETTES.map(p => p.id)
    expect(ids).toContain('indigo')
    expect(ids).toContain('violet')
    expect(ids).toContain('sky')
    expect(ids).toContain('emerald')
    expect(ids).toContain('rose')
    expect(ids).toContain('custom')
  })

  it('does not include amber', () => {
    expect(COLOR_PALETTES.map(p => p.id)).not.toContain('amber')
  })

  it('each palette has all required color fields', () => {
    const requiredFields: (keyof ColorPalette)[] = ['id', 'name', 'base', 'surface', 'elevated', 'border', 'primary', 'secondary', 'muted', 'accent', 'accentHover']
    for (const palette of COLOR_PALETTES) {
      for (const field of requiredFields) {
        expect(palette[field], `${palette.id}.${field}`).toBeTruthy()
      }
    }
  })

  it('each palette has unique id', () => {
    const ids = COLOR_PALETTES.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each preset palette id matches its name (lowercase)', () => {
    for (const palette of COLOR_PALETTES.filter(p => p.id !== 'custom')) {
      expect(palette.id).toBe(palette.name.toLowerCase())
    }
  })

  it('all color values are valid hex codes', () => {
    const hexPattern = /^#[0-9a-f]{6}$/i
    const colorFields: (keyof ColorPalette)[] = ['base', 'surface', 'elevated', 'border', 'primary', 'secondary', 'muted', 'accent', 'accentHover']
    for (const palette of COLOR_PALETTES) {
      for (const field of colorFields) {
        expect(palette[field], `${palette.id}.${field}`).toMatch(hexPattern)
      }
    }
  })

  it('base is darker than surface (lower numeric value)', () => {
    for (const palette of COLOR_PALETTES) {
      const baseL = parseInt(palette.base.slice(1), 16)
      const surfaceL = parseInt(palette.surface.slice(1), 16)
      expect(baseL, `${palette.id}: base should be darker than surface`).toBeLessThanOrEqual(surfaceL)
    }
  })

  it('surface is darker than elevated', () => {
    for (const palette of COLOR_PALETTES) {
      const surfaceL = parseInt(palette.surface.slice(1), 16)
      const elevatedL = parseInt(palette.elevated.slice(1), 16)
      expect(surfaceL, `${palette.id}: surface should be darker than elevated`).toBeLessThanOrEqual(elevatedL)
    }
  })

  it('accentHover is lighter than accent (for visibility)', () => {
    for (const palette of COLOR_PALETTES) {
      const accentL = parseInt(palette.accent.slice(1), 16)
      const hoverL = parseInt(palette.accentHover.slice(1), 16)
      expect(hoverL, `${palette.id}: accentHover should be lighter than accent`).toBeGreaterThanOrEqual(accentL)
    }
  })

  it('primary text is lighter than base (readable on dark backgrounds)', () => {
    for (const palette of COLOR_PALETTES) {
      const primaryL = parseInt(palette.primary.slice(1), 16)
      const baseL = parseInt(palette.base.slice(1), 16)
      expect(primaryL, `${palette.id}: primary text should be lighter than base`).toBeGreaterThan(baseL)
    }
  })

  it('text colors differ between palettes', () => {
    const primaries = COLOR_PALETTES.map(p => p.primary)
    expect(new Set(primaries).size).toBeGreaterThan(1)
  })
})

// ── applyPalette ──────────────────────────────────────────────────────────────

describe('applyPalette', () => {
  const mockSetProperty = vi.fn()
  const mockBodyStyle = { backgroundColor: '' }

  beforeEach(() => {
    mockSetProperty.mockClear()
    mockBodyStyle.backgroundColor = ''
    Object.defineProperty(globalThis, 'document', {
      value: {
        documentElement: { style: { setProperty: mockSetProperty } },
        body: { style: mockBodyStyle },
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // @ts-expect-error restore
    delete globalThis.document
  })

  it('sets all CSS custom properties', () => {
    const palette = getPaletteById('emerald')
    applyPalette(palette)
    expect(mockSetProperty).toHaveBeenCalledWith('--color-base', palette.base)
    expect(mockSetProperty).toHaveBeenCalledWith('--color-surface', palette.surface)
    expect(mockSetProperty).toHaveBeenCalledWith('--color-elevated', palette.elevated)
    expect(mockSetProperty).toHaveBeenCalledWith('--color-border', palette.border)
    expect(mockSetProperty).toHaveBeenCalledWith('--color-primary', palette.primary)
    expect(mockSetProperty).toHaveBeenCalledWith('--color-secondary', palette.secondary)
    expect(mockSetProperty).toHaveBeenCalledWith('--color-muted', palette.muted)
    expect(mockSetProperty).toHaveBeenCalledWith('--color-accent', palette.accent)
    expect(mockSetProperty).toHaveBeenCalledWith('--color-accent-hover', palette.accentHover)
  })

  it('does not set body background color (body bg blocks fixed -z-10 background images)', () => {
    const palette = getPaletteById('rose')
    applyPalette(palette)
    expect(mockBodyStyle.backgroundColor).toBe('')
  })

  it('sets 9 CSS properties total', () => {
    applyPalette(getPaletteById('sky'))
    expect(mockSetProperty).toHaveBeenCalledTimes(9)
  })

  it('does nothing when document is undefined (SSR safety)', () => {
    Object.defineProperty(globalThis, 'document', { value: undefined, writable: true, configurable: true })
    expect(() => applyPalette(getPaletteById('indigo'))).not.toThrow()
  })

  it('applies different values for different palettes', () => {
    applyPalette(getPaletteById('emerald'))
    const emeraldCalls = [...mockSetProperty.mock.calls]

    mockSetProperty.mockClear()
    applyPalette(getPaletteById('rose'))
    const roseCalls = [...mockSetProperty.mock.calls]

    const emeraldAccent = emeraldCalls.find(c => c[0] === '--color-accent')?.[1]
    const roseAccent = roseCalls.find(c => c[0] === '--color-accent')?.[1]
    expect(emeraldAccent).not.toBe(roseAccent)
  })

  it('sets palette-specific text colors', () => {
    applyPalette(getPaletteById('violet'))
    const violetCalls = [...mockSetProperty.mock.calls]

    mockSetProperty.mockClear()
    applyPalette(getPaletteById('indigo'))
    const indigoCalls = [...mockSetProperty.mock.calls]

    const violetPrimary = violetCalls.find(c => c[0] === '--color-primary')?.[1]
    const indigoPrimary = indigoCalls.find(c => c[0] === '--color-primary')?.[1]
    expect(violetPrimary).not.toBe(indigoPrimary)
  })
})
