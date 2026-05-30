import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

const stateStore = new Map<string, ReturnType<typeof ref>>()
vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
  if (!stateStore.has(key)) stateStore.set(key, ref(init()))
  return stateStore.get(key)!
})

const dirtyRef = ref(false)
vi.stubGlobal('useEditMode', () => ({
  active: ref(false),
  dirty: dirtyRef,
  snapshot: ref(null),
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
