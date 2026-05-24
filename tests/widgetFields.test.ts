import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockExistsSync, mockReadFileSync, mockLoad } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockLoad: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: vi.fn(),
}))

vi.mock('node:path', () => ({
  resolve: vi.fn(() => '/mock/config'),
  join: (_base: string, file: string) => `/mock/config/${file}`,
}))

vi.mock('js-yaml', () => ({
  load: mockLoad,
  dump: vi.fn((v: unknown) => String(v)),
}))

import { getOrderedActiveFields, getActiveFields } from '../server/utils/widget-fields'

type Field = { label: string; value: number }

const allFields: Field[] = [
  { label: 'Series', value: 10 },
  { label: 'Monitored', value: 8 },
  { label: 'Queued', value: 2 },
  { label: 'Wanted', value: 1 },
  { label: 'Cutoff unmet', value: 3 },
]

function setConfig(config: Record<string, string[]> | null) {
  if (config === null) {
    mockExistsSync.mockReturnValue(false)
  } else {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('')
    mockLoad.mockReturnValue(config)
  }
}

beforeEach(() => {
  mockExistsSync.mockReset()
  mockReadFileSync.mockReset()
  mockLoad.mockReset()
  setConfig({})
})

describe('getOrderedActiveFields', () => {
  it('returns all fields in original order when no config file exists', () => {
    setConfig(null)
    expect(getOrderedActiveFields('sonarr', allFields)).toEqual(allFields)
  })

  it('returns all fields in original order when type has no saved config', () => {
    setConfig({})
    expect(getOrderedActiveFields('sonarr', allFields)).toEqual(allFields)
  })

  it('returns only saved labels', () => {
    setConfig({ sonarr: ['Series', 'Queued'] })
    expect(getOrderedActiveFields('sonarr', allFields).map(f => f.label)).toEqual(['Series', 'Queued'])
  })

  it('respects saved order, not original definition order', () => {
    setConfig({ sonarr: ['Queued', 'Series', 'Wanted'] })
    expect(getOrderedActiveFields('sonarr', allFields).map(f => f.label)).toEqual(['Queued', 'Series', 'Wanted'])
  })

  it('carries through the full field object, not just the label', () => {
    setConfig({ sonarr: ['Monitored'] })
    expect(getOrderedActiveFields('sonarr', allFields)).toEqual([{ label: 'Monitored', value: 8 }])
  })

  it('skips saved labels not present in allFields', () => {
    setConfig({ sonarr: ['Series', 'NonExistent', 'Queued'] })
    expect(getOrderedActiveFields('sonarr', allFields).map(f => f.label)).toEqual(['Series', 'Queued'])
  })

  it('returns empty array when saved config is empty list', () => {
    setConfig({ sonarr: [] })
    expect(getOrderedActiveFields('sonarr', allFields)).toEqual([])
  })

  it('is scoped by type - other type config is ignored', () => {
    setConfig({ radarr: ['Series'] })
    expect(getOrderedActiveFields('sonarr', allFields)).toEqual(allFields)
  })
})

describe('getActiveFields', () => {
  it('returns Set of all labels when no config', () => {
    setConfig({})
    const active = getActiveFields('sonarr', ['Series', 'Queued'])
    expect(active.has('Series')).toBe(true)
    expect(active.has('Queued')).toBe(true)
  })

  it('returns only saved labels as Set', () => {
    setConfig({ sonarr: ['Series'] })
    const active = getActiveFields('sonarr', ['Series', 'Queued'])
    expect(active.has('Series')).toBe(true)
    expect(active.has('Queued')).toBe(false)
  })
})
