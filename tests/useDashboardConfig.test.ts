import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

const stateStore = new Map<string, ReturnType<typeof ref>>()
vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
  if (!stateStore.has(key)) stateStore.set(key, ref(init()))
  return stateStore.get(key)!
})

const dirtyRef = ref(false)
const snapshotRef = ref<unknown>(null)
vi.stubGlobal('useEditMode', () => ({
  active: ref(false),
  dirty: dirtyRef,
  snapshot: snapshotRef,
  enter: vi.fn(),
  exit: vi.fn(),
}))

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)

import { useDashboardConfig } from '../app/composables/useDashboardConfig'
import { useConfigStore } from '../app/stores/config'

const initialConfig = () => ({
  services: [
    { name: 'Media', services: [{ name: 'Sonarr', url: 'http://sonarr' }] },
  ],
  bookmarks: [
    { name: 'Links', bookmarks: [{ name: 'GitHub', url: 'https://github.com' }] },
  ],
  widgets: [],
  settings: {},
})

beforeEach(() => {
  stateStore.clear()
  snapshotRef.value = null
  fetchMock.mockReset()
  fetchMock.mockImplementation((url: string) =>
    Promise.resolve(url === '/api/config' ? initialConfig() : { ok: true }),
  )
  const store = useConfigStore()
  store.config = initialConfig()
  store.loaded = true
})

// ─── updateServiceGroup — rename ──────────────────────────────────────────────

describe('updateServiceGroup rename', () => {
  it('updates the group name in localConfig', async () => {
    const { localConfig, updateServiceGroup } = useDashboardConfig()
    await nextTick()

    updateServiceGroup('Media', { name: 'Arr', services: [] })
    expect(localConfig.value.services.find(g => g.name === 'Arr')).toBeTruthy()
    expect(localConfig.value.services.find(g => g.name === 'Media')).toBeFalsy()
  })

  it('syncs sectionOrder when service group is renamed', async () => {
    const { sectionOrder, updateServiceGroup } = useDashboardConfig()
    await nextTick()

    updateServiceGroup('Media', { name: 'Arr', services: [] })
    expect(sectionOrder.value.some(s => s.name === 'Arr' && s.type === 'service')).toBe(true)
    expect(sectionOrder.value.some(s => s.name === 'Media')).toBe(false)
  })

  it('does not alter sectionOrder when name is unchanged', async () => {
    const { sectionOrder, updateServiceGroup } = useDashboardConfig()
    await nextTick()
    const before = JSON.stringify(sectionOrder.value)

    updateServiceGroup('Media', { name: 'Media', services: [] })
    expect(JSON.stringify(sectionOrder.value)).toBe(before)
  })

  it('save includes renamed group under new name', async () => {
    const { updateServiceGroup, save } = useDashboardConfig()
    await nextTick()

    updateServiceGroup('Media', { name: 'Arr', services: [{ name: 'Sonarr', url: 'http://sonarr' }] })
    await save()

    const body = fetchMock.mock.calls.find(c => c[1]?.body?.action === 'reorderGroups')?.[1].body
    expect(body.groups.some((g: { name: string }) => g.name === 'Arr')).toBe(true)
    expect(body.groups.some((g: { name: string }) => g.name === 'Media')).toBe(false)
  })
})

// ─── deleting an item — explicit delete payload ──────────────────────────────

describe('save reports deleted items so the orphan guard keeps them removed', () => {
  it('lists a service removed from a surviving group under `deleted`', async () => {
    snapshotRef.value = initialConfig()
    const { updateServiceGroup, save } = useDashboardConfig()
    await nextTick()

    // Remove Sonarr from the Media group (group survives)
    updateServiceGroup('Media', { name: 'Media', services: [] })
    await save()

    const body = fetchMock.mock.calls.find(c =>
      c[1]?.body?.action === 'reorderGroups' && c[0].includes('services')
    )?.[1].body
    expect(body.deleted).toContain('Sonarr')
  })

  it('lists a removed bookmark under `deleted`', async () => {
    snapshotRef.value = initialConfig()
    const { updateBookmarkGroup, save } = useDashboardConfig()
    await nextTick()

    updateBookmarkGroup('Links', { name: 'Links', bookmarks: [] })
    await save()

    const body = fetchMock.mock.calls.find(c =>
      c[1]?.body?.action === 'reorderGroups' && c[0].includes('bookmarks')
    )?.[1].body
    expect(body.deleted).toContain('GitHub')
  })

  it('does not flag a service that merely moved groups', async () => {
    snapshotRef.value = initialConfig()
    const { localConfig, updateServiceGroup, addServiceGroup, save } = useDashboardConfig()
    await nextTick()

    addServiceGroup('New')
    updateServiceGroup('Media', { name: 'Media', services: [] })
    updateServiceGroup('New', { name: 'New', services: [{ name: 'Sonarr', url: 'http://sonarr' }] })
    expect(localConfig.value.services.find(g => g.name === 'New')?.services[0]?.name).toBe('Sonarr')
    await save()

    const body = fetchMock.mock.calls.find(c =>
      c[1]?.body?.action === 'reorderGroups' && c[0].includes('services')
    )?.[1].body
    expect(body.deleted).not.toContain('Sonarr')
  })
})

// ─── updateBookmarkGroup — rename ─────────────────────────────────────────────

describe('updateBookmarkGroup rename', () => {
  it('updates the group name in localConfig', async () => {
    const { localConfig, updateBookmarkGroup } = useDashboardConfig()
    await nextTick()

    updateBookmarkGroup('Links', { name: 'Bookmarks', bookmarks: [] })
    expect(localConfig.value.bookmarks.find(g => g.name === 'Bookmarks')).toBeTruthy()
    expect(localConfig.value.bookmarks.find(g => g.name === 'Links')).toBeFalsy()
  })

  it('syncs sectionOrder when bookmark group is renamed', async () => {
    const { sectionOrder, updateBookmarkGroup } = useDashboardConfig()
    await nextTick()

    updateBookmarkGroup('Links', { name: 'Bookmarks', bookmarks: [] })
    expect(sectionOrder.value.some(s => s.name === 'Bookmarks' && s.type === 'bookmark')).toBe(true)
    expect(sectionOrder.value.some(s => s.name === 'Links')).toBe(false)
  })

  it('save includes renamed bookmark group under new name', async () => {
    const { updateBookmarkGroup, save } = useDashboardConfig()
    await nextTick()

    updateBookmarkGroup('Links', { name: 'Favorites', bookmarks: [] })
    await save()

    const body = fetchMock.mock.calls.find(c =>
      c[1]?.body?.action === 'reorderGroups' && c[0].includes('bookmarks')
    )?.[1].body
    expect(body?.groups.some((g: { name: string }) => g.name === 'Favorites')).toBe(true)
    expect(body?.groups.some((g: { name: string }) => g.name === 'Links')).toBe(false)
  })
})
