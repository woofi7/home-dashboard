import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { WidgetDefinition, AuthType } from '../shared/widgetDefinitions/types'

const VALID_AUTH_TYPES: AuthType[] = ['header', 'bearer', 'basic', 'query', 'password', 'none']

const definitionDir = resolve('./shared/widgetDefinitions')
const definitionFiles = readdirSync(definitionDir)
  .filter(f => f.endsWith('.ts') && f !== 'types.ts')
  .sort()

const WIDGET_SLUGS = definitionFiles.map(f => f.slice(0, -3))

// Dynamically load all definitions
const definitions = await Promise.all(
  WIDGET_SLUGS.map(async slug => {
    const mod = await import(`../shared/widgetDefinitions/${slug}.ts`)
    return { slug, def: mod.default as WidgetDefinition }
  }),
)

describe('widgetDefinitions — structure', () => {
  it('has at least one definition', () => {
    expect(WIDGET_SLUGS.length).toBeGreaterThan(0)
  })

  it('definition file names are all lowercase with no spaces', () => {
    for (const slug of WIDGET_SLUGS) {
      expect(slug).toMatch(/^[a-z0-9]+$/)
    }
  })

  for (const { slug, def } of definitions) {
    describe(slug, () => {
      it('has a non-empty name', () => {
        expect(typeof def.name).toBe('string')
        expect(def.name.length).toBeGreaterThan(0)
      })

      it('has a valid authType', () => {
        expect(VALID_AUTH_TYPES).toContain(def.authType)
      })

      it('has at least one field', () => {
        expect(def.fields.length).toBeGreaterThan(0)
      })

      it('every field has a non-empty label and desc', () => {
        for (const field of def.fields) {
          expect(typeof field.label).toBe('string')
          expect(field.label.length).toBeGreaterThan(0)
          expect(typeof field.desc).toBe('string')
          expect(field.desc.length).toBeGreaterThan(0)
        }
      })

      it('field labels are unique', () => {
        const labels = def.fields.map(f => f.label)
        expect(new Set(labels).size).toBe(labels.length)
      })
    })
  }
})

describe('widgetDefinitions — coverage', () => {
  it('every widget fetcher has a matching definition', async () => {
    const { readdirSync: rds } = await import('node:fs')
    const fetcherSlugs = rds(resolve('./server/api/widget'))
      .filter((f: string) => f.endsWith('.get.ts'))
      .map((f: string) => f.slice(0, -'.get.ts'.length))
      .sort()

    expect(WIDGET_SLUGS).toEqual(fetcherSlugs)
  })

  it('every definition has a matching widget fetcher', async () => {
    const { readdirSync: rds } = await import('node:fs')
    const fetcherSlugs = rds(resolve('./server/api/widget'))
      .filter((f: string) => f.endsWith('.get.ts'))
      .map((f: string) => f.slice(0, -'.get.ts'.length))
      .sort()

    for (const slug of WIDGET_SLUGS) {
      expect(fetcherSlugs).toContain(slug)
    }
  })
})

describe('widgetDefinitions — fetcher meta', () => {
  for (const { slug, def } of definitions) {
    it(`${slug}: fetcher exports meta matching its definition`, async () => {
      const mod = await import(`../server/api/widget/${slug}.get.ts`)
      expect(mod.meta).toBe(def)
    })
  }
})
