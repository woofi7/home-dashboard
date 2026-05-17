import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// useState is a Nuxt global — mock it as a key-tracking ref factory
const stateStore = new Map<string, ReturnType<typeof ref>>()
vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
  if (!stateStore.has(key))
    stateStore.set(key, ref(init()))
  return stateStore.get(key)!
})

import { useEditMode } from '../app/composables/useEditMode'

beforeEach(() => {
  stateStore.clear()
})

type Config = { services: unknown[]; bookmarks: unknown[]; widgets: unknown[]; settings: Record<string, unknown> }

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    services: [{ name: 'Sonarr', url: 'http://sonarr' }],
    bookmarks: [],
    widgets: [],
    settings: { title: 'Dashboard' },
    ...overrides,
  }
}

describe('useEditMode — initial state', () => {
  it('starts inactive', () => {
    const { active } = useEditMode()
    expect(active.value).toBe(false)
  })

  it('starts not dirty', () => {
    const { dirty } = useEditMode()
    expect(dirty.value).toBe(false)
  })

  it('starts with null snapshot', () => {
    const { snapshot } = useEditMode()
    expect(snapshot.value).toBeNull()
  })
})

describe('useEditMode — enter()', () => {
  it('sets active to true', () => {
    const { active, enter } = useEditMode()
    enter(makeConfig())
    expect(active.value).toBe(true)
  })

  it('stores a deep-copy snapshot of the config', () => {
    const { snapshot, enter } = useEditMode()
    const config = makeConfig()
    enter(config)
    expect(snapshot.value).toEqual(config)
    expect(snapshot.value).not.toBe(config)
  })

  it('snapshot is isolated from subsequent mutations', () => {
    const { snapshot, enter } = useEditMode()
    const config = makeConfig()
    enter(config)
    config.services.push({ name: 'Radarr' })
    expect((snapshot.value!.services as unknown[]).length).toBe(1)
  })
})

describe('useEditMode — rollback()', () => {
  it('restores config to snapshot value', () => {
    const { enter, rollback } = useEditMode()
    const original = makeConfig()
    enter(original)
    const live = ref(makeConfig({ services: [{ name: 'Radarr' }] }))
    rollback(live)
    expect(live.value.services).toEqual(original.services)
  })

  it('the restored config is a deep copy, not the snapshot reference', () => {
    const { snapshot, enter, rollback } = useEditMode()
    const original = makeConfig()
    enter(original)
    const live = ref(makeConfig())
    rollback(live)
    expect(live.value).not.toBe(snapshot.value)
  })

  it('sets active to false', () => {
    const { active, enter, rollback } = useEditMode()
    enter(makeConfig())
    rollback(ref(makeConfig()))
    expect(active.value).toBe(false)
  })

  it('sets dirty to false', () => {
    const { dirty, enter, rollback } = useEditMode()
    enter(makeConfig())
    dirty.value = true
    rollback(ref(makeConfig()))
    expect(dirty.value).toBe(false)
  })

  it('clears the snapshot', () => {
    const { snapshot, enter, rollback } = useEditMode()
    enter(makeConfig())
    rollback(ref(makeConfig()))
    expect(snapshot.value).toBeNull()
  })
})

describe('useEditMode — exit()', () => {
  it('sets active to false', () => {
    const { active, enter, exit } = useEditMode()
    enter(makeConfig())
    exit()
    expect(active.value).toBe(false)
  })

  it('sets dirty to false', () => {
    const { dirty, enter, exit } = useEditMode()
    enter(makeConfig())
    dirty.value = true
    exit()
    expect(dirty.value).toBe(false)
  })

  it('clears the snapshot', () => {
    const { snapshot, enter, exit } = useEditMode()
    enter(makeConfig())
    exit()
    expect(snapshot.value).toBeNull()
  })
})

describe('useEditMode — shared state', () => {
  it('active flag is shared across multiple calls to useEditMode', () => {
    const a = useEditMode()
    const b = useEditMode()
    a.enter(makeConfig())
    expect(b.active.value).toBe(true)
  })

  it('dirty flag is shared across instances', () => {
    const a = useEditMode()
    const b = useEditMode()
    a.dirty.value = true
    expect(b.dirty.value).toBe(true)
  })
})
