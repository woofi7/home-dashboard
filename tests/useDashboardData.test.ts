// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'

// useDashboardData imports useWidgetRefresh directly, so mock the module (not a global)
vi.mock('../app/composables/useWidgetRefresh', async () => {
  const { ref } = await import('vue')
  const refreshKey = ref(0)
  const forceKey = ref(0)
  return { useWidgetRefresh: () => ({ refreshKey, forceKey }) }
})

import { useWidgetRefresh } from '../app/composables/useWidgetRefresh'
import { useConfigStore } from '../app/stores/config'
import { useViewStore } from '../app/stores/view'
import { useStatusStore } from '../app/stores/status'
import { useWidgetCardsStore } from '../app/stores/widgetCards'
import { useBookmarkClicksStore } from '../app/stores/bookmarkClicks'
import { useConnectivityStore } from '../app/stores/connectivity'
import { useDashboardData } from '../app/composables/useDashboardData'

const Wrapper = defineComponent({
  setup() {
    useDashboardData()
    return () => null
  },
})

let config: ReturnType<typeof useConfigStore>
let view: ReturnType<typeof useViewStore>
let status: ReturnType<typeof useStatusStore>
let cards: ReturnType<typeof useWidgetCardsStore>
let clicks: ReturnType<typeof useBookmarkClicksStore>
let conn: ReturnType<typeof useConnectivityStore>

const { refreshKey, forceKey } = useWidgetRefresh()

beforeEach(() => {
  refreshKey.value = 0
  forceKey.value = 0
  config = useConfigStore()
  view = useViewStore()
  status = useStatusStore()
  cards = useWidgetCardsStore()
  clicks = useBookmarkClicksStore()
  conn = useConnectivityStore()
  for (const [store, methods] of [
    [config, ['load', 'refresh']],
    [view, ['load', 'refresh']],
    [status, ['load', 'refresh']],
    [cards, ['load', 'refresh']],
    [clicks, ['load', 'refresh']],
  ] as const)
    for (const m of methods)
      vi.spyOn(store as never, m).mockResolvedValue(undefined as never)
  vi.spyOn(conn, 'ping').mockResolvedValue(undefined)
  vi.spyOn(conn, 'initialize').mockImplementation(() => {})
})

describe('useDashboardData - initial load', () => {
  it('initializes connectivity and loads every store on mount', async () => {
    mount(Wrapper)
    await flushPromises()
    expect(conn.initialize).toHaveBeenCalledOnce()
    expect(config.load).toHaveBeenCalledOnce()
    expect(view.load).toHaveBeenCalledOnce()
    expect(status.load).toHaveBeenCalledOnce()
    expect(cards.load).toHaveBeenCalledOnce()
    expect(clicks.load).toHaveBeenCalledOnce()
  })
})

describe('useDashboardData - auto refresh tick', () => {
  it('refreshes only live status and connectivity, not the static view data', async () => {
    mount(Wrapper)
    await flushPromises()
    refreshKey.value++
    await nextTick()
    await flushPromises()
    expect(status.refresh).toHaveBeenCalledWith(false)
    expect(conn.ping).toHaveBeenCalled()
    expect(view.refresh).not.toHaveBeenCalled()
    expect(cards.refresh).not.toHaveBeenCalled()
    expect(clicks.refresh).not.toHaveBeenCalled()
  })
})

describe('useDashboardData - forced refresh', () => {
  it('refreshes everything when the force key changes', async () => {
    mount(Wrapper)
    await flushPromises()
    forceKey.value++
    refreshKey.value++
    await nextTick()
    await flushPromises()
    expect(status.refresh).toHaveBeenCalledWith(true)
    expect(view.refresh).toHaveBeenCalledOnce()
    expect(cards.refresh).toHaveBeenCalledOnce()
    expect(clicks.refresh).toHaveBeenCalledOnce()
    expect(conn.ping).toHaveBeenCalled()
  })
})
