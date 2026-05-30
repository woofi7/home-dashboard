// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useWidgetRefresh } from '../app/composables/useWidgetRefresh'

let api: ReturnType<typeof useWidgetRefresh>
const Wrapper = defineComponent({
  setup() {
    api = useWidgetRefresh()
    return () => null
  },
})

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
}

beforeEach(() => {
  vi.useFakeTimers()
  setHidden(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useWidgetRefresh', () => {
  it('ticks the countdown down each second', () => {
    const w = mount(Wrapper)
    expect(api.countdown.value).toBe(30)
    vi.advanceTimersByTime(1000)
    expect(api.countdown.value).toBe(29)
    vi.advanceTimersByTime(2000)
    expect(api.countdown.value).toBe(27)
    w.unmount()
  })

  it('bumps refreshKey every 30s while the tab is visible', () => {
    const w = mount(Wrapper)
    const before = api.refreshKey.value
    vi.advanceTimersByTime(30000)
    expect(api.refreshKey.value).toBe(before + 1)
    w.unmount()
  })

  it('defers the refresh while hidden, then fires on visibilitychange', () => {
    const w = mount(Wrapper)
    const before = api.refreshKey.value
    setHidden(true)
    vi.advanceTimersByTime(30000)
    expect(api.refreshKey.value).toBe(before)
    setHidden(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(api.refreshKey.value).toBe(before + 1)
    w.unmount()
  })

  it('forceRefresh bumps forceKey + refreshKey and resets the countdown', () => {
    const w = mount(Wrapper)
    vi.advanceTimersByTime(5000)
    const f = api.forceKey.value
    const r = api.refreshKey.value
    api.forceRefresh()
    expect(api.forceKey.value).toBe(f + 1)
    expect(api.refreshKey.value).toBe(r + 1)
    expect(api.countdown.value).toBe(30)
    w.unmount()
  })

  it('stops the timers once the last consumer unmounts', () => {
    const w = mount(Wrapper)
    w.unmount()
    const after = api.refreshKey.value
    vi.advanceTimersByTime(60000)
    expect(api.refreshKey.value).toBe(after)
  })
})
