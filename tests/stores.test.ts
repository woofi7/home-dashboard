import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConfigStore } from '../app/stores/config'
import { useViewStore } from '../app/stores/view'
import { useStatusStore } from '../app/stores/status'
import { useWidgetCardsStore } from '../app/stores/widgetCards'
import { useBookmarkClicksStore } from '../app/stores/bookmarkClicks'
import { useConnectivityStore } from '../app/stores/connectivity'

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

describe('useConfigStore', () => {
  it('refresh populates config, lastUpdated and loaded', async () => {
    fetchMock.mockResolvedValue({ services: [{ name: 'Media', services: [] }], bookmarks: [], widgets: [], settings: { title: 'Home' } })
    const store = useConfigStore()
    await store.refresh()
    expect(store.config.services[0]!.name).toBe('Media')
    expect(store.config.settings.title).toBe('Home')
    expect(store.loaded).toBe(true)
    expect(store.lastUpdated).toBeGreaterThan(0)
  })

  it('keeps the last snapshot when refresh fails', async () => {
    const store = useConfigStore()
    store.config = { services: [{ name: 'Cached', services: [] }], bookmarks: [], widgets: [], settings: {} }
    store.loaded = true
    fetchMock.mockRejectedValue(new Error('offline'))
    await store.refresh()
    expect(store.config.services[0]!.name).toBe('Cached')
  })
})

describe('useViewStore', () => {
  it('refresh fills weather, calendar and background', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/weather')
        return Promise.resolve({ temp: 20 })
      if (url === '/api/calendar')
        return Promise.resolve({ authorized: true, days: [], tasks: [] })
      return Promise.resolve({ thumb: 't', full: 'f' })
    })
    const store = useViewStore()
    await store.refresh()
    expect(store.weather).toEqual({ temp: 20 })
    expect(store.calendar?.authorized).toBe(true)
    expect(store.background?.full).toBe('f')
    expect(store.lastUpdated).toBeGreaterThan(0)
  })

  it('keeps prior values for endpoints that fail', async () => {
    const store = useViewStore()
    store.weather = { temp: 99 }
    fetchMock.mockRejectedValue(new Error('offline'))
    await store.refresh()
    expect(store.weather).toEqual({ temp: 99 })
  })

  it('completeTask removes the task and posts to the API', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    const store = useViewStore()
    store.calendar = { authorized: true, days: [], tasks: [
      { id: 't1', listId: 'l1', title: 'A', url: '' },
      { id: 't2', listId: 'l1', title: 'B', url: '' },
    ] }
    await store.completeTask({ id: 't1', listId: 'l1', title: 'A', url: '' })
    expect(store.calendar?.tasks.map(t => t.id)).toEqual(['t2'])
    expect(fetchMock).toHaveBeenCalledWith('/api/calendar/task', { method: 'POST', body: { listId: 'l1', taskId: 't1' } })
  })

  it('completeTask restores the task when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('403'))
    const store = useViewStore()
    store.calendar = { authorized: true, days: [], tasks: [{ id: 't1', listId: 'l1', title: 'A', url: '' }] }
    await expect(store.completeTask({ id: 't1', listId: 'l1', title: 'A', url: '' })).rejects.toThrow()
    expect(store.calendar?.tasks.map(t => t.id)).toEqual(['t1'])
  })
})

describe('useStatusStore', () => {
  it('refresh maps docker, ping and widgets', async () => {
    fetchMock.mockResolvedValue({ docker: { srv: {} }, ping: { 'http://x': true }, widgets: { Sonarr: { fields: [] } } })
    const store = useStatusStore()
    await store.refresh()
    expect(store.pingStatus['http://x']).toBe(true)
    expect(store.widgetData.Sonarr).toEqual({ fields: [] })
  })

  it('passes force flag as a request header', async () => {
    fetchMock.mockResolvedValue({ docker: {}, ping: {}, widgets: {} })
    const store = useStatusStore()
    await store.refresh(true)
    expect(fetchMock).toHaveBeenCalledWith('/api/refresh', expect.objectContaining({ headers: { 'x-refresh-force': '1' } }))
  })

  it('passes widget error outcomes through unchanged', async () => {
    fetchMock.mockResolvedValue({ docker: {}, ping: {}, widgets: { Sonarr: { error: { kind: 'auth', status: 401 } } } })
    const store = useStatusStore()
    await store.refresh()
    expect(store.widgetData.Sonarr).toEqual({ error: { kind: 'auth', status: 401 } })
  })
})

describe('useWidgetCardsStore', () => {
  it('fetches a card per configured widget', async () => {
    useConfigStore().config = { services: [], bookmarks: [], widgets: [{ name: 'CPU', type: 'beszel', url: 'http://b' }], settings: {} }
    fetchMock.mockResolvedValue({ fields: [{ label: 'Load', value: '1' }] })
    const store = useWidgetCardsStore()
    await store.refresh()
    expect(store.byName('CPU')?.status).toBe('ok')
    expect(store.byName('CPU')?.data?.fields[0]!.label).toBe('Load')
  })

  it('marks a card errored when it has no cached data and the fetch fails', async () => {
    useConfigStore().config = { services: [], bookmarks: [], widgets: [{ name: 'CPU', type: 'beszel', url: 'http://b' }], settings: {} }
    fetchMock.mockRejectedValue(new Error('down'))
    const store = useWidgetCardsStore()
    await store.refresh()
    expect(store.byName('CPU')?.status).toBe('error')
  })

  it('maps a widget error body to an error card with the reason', async () => {
    useConfigStore().config = { services: [], bookmarks: [], widgets: [{ name: 'CPU', type: 'beszel', url: 'http://b' }], settings: {} }
    fetchMock.mockResolvedValue({ error: { kind: 'auth', status: 401, message: 'Credentials refused' } })
    const store = useWidgetCardsStore()
    await store.refresh()
    expect(store.byName('CPU')?.status).toBe('error')
    expect(store.byName('CPU')?.error?.kind).toBe('auth')
  })
})

describe('useBookmarkClicksStore', () => {
  it('increment bumps the count and POSTs', async () => {
    fetchMock.mockResolvedValue({})
    const store = useBookmarkClicksStore()
    await store.increment('GitHub')
    expect(store.clicks.GitHub).toBe(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/bookmarks/clicks', { method: 'POST', body: { name: 'GitHub' } })
  })

  it('keeps the optimistic count when the POST fails (offline)', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const store = useBookmarkClicksStore()
    await store.increment('HN')
    expect(store.clicks.HN).toBe(1)
  })
})

describe('useConnectivityStore', () => {
  it('ping sets online true on success', async () => {
    fetchMock.mockResolvedValue({ status: 'ok' })
    const store = useConnectivityStore()
    store.online = false
    await store.ping()
    expect(store.online).toBe(true)
    expect(store.lastChecked).toBeGreaterThan(0)
  })

  it('ping sets online false on failure', async () => {
    fetchMock.mockRejectedValue(new Error('down'))
    const store = useConnectivityStore()
    await store.ping()
    expect(store.online).toBe(false)
  })

  it('ping uses a short timeout so an unreachable server is detected quickly', async () => {
    fetchMock.mockResolvedValue({ status: 'ok' })
    await useConnectivityStore().ping()
    expect(fetchMock).toHaveBeenCalledWith('/api/healthcheck', expect.objectContaining({ timeout: 2000 }))
  })

  it('lastSnapshotAt is the newest store timestamp', () => {
    useConfigStore().lastUpdated = 100
    useViewStore().lastUpdated = 500
    useStatusStore().lastUpdated = 300
    expect(useConnectivityStore().lastSnapshotAt).toBe(500)
  })
})
