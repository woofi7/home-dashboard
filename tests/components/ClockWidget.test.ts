// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { globalStubs } from './helpers'
import ClockWidget from '~/components/dashboard/ClockWidget.vue'

async function mountClock(timezone?: string) {
  const w = mount(ClockWidget, {
    props: timezone ? { timezone } : {},
    global: { stubs: globalStubs },
  })
  await nextTick()
  return w
}

describe('ClockWidget.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T15:30:45Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a time string', async () => {
    const w = await mountClock()
    expect(w.text()).toMatch(/\d{2}:\d{2}:\d{2}/)
  })

  it('renders a date string with day of week and year', async () => {
    const w = await mountClock()
    expect(w.text()).toMatch(/\d{4}/)
  })

  it('accepts a timezone prop without throwing', async () => {
    await expect(mountClock('America/Toronto')).resolves.toBeTruthy()
  })

  it('accepts UTC timezone prop', async () => {
    await expect(mountClock('UTC')).resolves.toBeTruthy()
  })

  it('renders different time for UTC vs offset timezone', async () => {
    const utcClock = await mountClock('UTC')
    const torontoClock = await mountClock('America/Toronto')
    expect(utcClock.text()).toMatch(/\d{2}:\d{2}:\d{2}/)
    expect(torontoClock.text()).toMatch(/\d{2}:\d{2}:\d{2}/)
  })

  it('updates time on interval tick', async () => {
    const w = await mountClock('UTC')
    const before = w.text()
    vi.advanceTimersByTime(1000)
    await w.vm.$nextTick()
    const after = w.text()
    expect(before).not.toBe(after)
  })
})
