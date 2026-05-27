export type ColorPalette = {
  id: string
  name: string
  base: string
  surface: string
  elevated: string
  border: string
  primary: string
  secondary: string
  muted: string
  accent: string
  accentHover: string
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'indigo',
    name: 'Indigo',
    base: '#0f1117',
    surface: '#1a1d27',
    elevated: '#22263a',
    border: '#2e3347',
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    muted: '#64748b',
    accent: '#6366f1',
    accentHover: '#818cf8',
  },
  {
    id: 'violet',
    name: 'Violet',
    base: '#0e0b14',
    surface: '#171220',
    elevated: '#20182e',
    border: '#2e2342',
    primary: '#ede9f6',
    secondary: '#a89dc4',
    muted: '#6f638f',
    accent: '#8b5cf6',
    accentHover: '#a78bfa',
  },
  {
    id: 'sky',
    name: 'Sky',
    base: '#0a0f14',
    surface: '#0f1820',
    elevated: '#14222e',
    border: '#1e3244',
    primary: '#e0f0f9',
    secondary: '#7eb8d4',
    muted: '#4a7d99',
    accent: '#0ea5e9',
    accentHover: '#38bdf8',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    base: '#0b1210',
    surface: '#131f1b',
    elevated: '#1a2d26',
    border: '#243d32',
    primary: '#e0f5ee',
    secondary: '#7ec4a8',
    muted: '#4a8a6e',
    accent: '#10b981',
    accentHover: '#34d399',
  },
  {
    id: 'rose',
    name: 'Rose',
    base: '#120e0f',
    surface: '#1e1416',
    elevated: '#2a1b1e',
    border: '#3d262a',
    primary: '#f5e0e3',
    secondary: '#c4858e',
    muted: '#8a4f58',
    accent: '#f43f5e',
    accentHover: '#fb7185',
  },
  {
    id: 'amber',
    name: 'Amber',
    base: '#120f0a',
    surface: '#1e190f',
    elevated: '#2a2415',
    border: '#3d3520',
    primary: '#f5efe0',
    secondary: '#c4a96a',
    muted: '#8a7040',
    accent: '#f59e0b',
    accentHover: '#fbbf24',
  },
]

export function applyPalette(palette: ColorPalette) {
  if (typeof document === 'undefined')
    return
  const el = document.documentElement
  el.style.setProperty('--color-base', palette.base)
  el.style.setProperty('--color-surface', palette.surface)
  el.style.setProperty('--color-elevated', palette.elevated)
  el.style.setProperty('--color-border', palette.border)
  el.style.setProperty('--color-primary', palette.primary)
  el.style.setProperty('--color-secondary', palette.secondary)
  el.style.setProperty('--color-muted', palette.muted)
  el.style.setProperty('--color-accent', palette.accent)
  el.style.setProperty('--color-accent-hover', palette.accentHover)
}

export function getPaletteById(id: string): ColorPalette {
  return COLOR_PALETTES.find(p => p.id === id) ?? COLOR_PALETTES[0]
}
