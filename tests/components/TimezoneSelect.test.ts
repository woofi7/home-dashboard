// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { globalStubs } from './helpers'
import TimezoneSelect from '~/components/admin/TimezoneSelect.vue'

const MOCK_ZONES = ['America/Toronto', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Pacific/Auckland']

const origSupportedValuesOf = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf

beforeAll(() => {
  (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf = (key: string) =>
    key === 'timeZone' ? MOCK_ZONES : []
})

afterAll(() => {
  (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf = origSupportedValuesOf
})

function mountSelect(modelValue = '') {
  return mount(TimezoneSelect, {
    props: { modelValue },
    global: { stubs: globalStubs },
    attachTo: document.body,
  })
}

describe('TimezoneSelect.vue', () => {
  describe('placeholder', () => {
    it('shows "Server time (default)" when closed and no value', () => {
      const w = mountSelect()
      expect(w.find('input').attributes('placeholder')).toBe('Server time (default)')
    })

    it('shows "Search timezones..." when dropdown is open', async () => {
      const w = mountSelect()
      await w.find('input').trigger('focus')
      expect(w.find('input').attributes('placeholder')).toBe('Search timezones...')
    })

    it('shows selected value in input when closed', async () => {
      const w = mountSelect('America/Toronto')
      expect(w.find('input').element.value).toBe('America/Toronto')
    })
  })

  describe('clear button', () => {
    it('does not show clear button when no value is set', () => {
      const w = mountSelect()
      expect(w.find('[title="Reset to server default"]').exists()).toBe(false)
    })

    it('shows clear button when a value is set', () => {
      const w = mountSelect('America/Toronto')
      expect(w.find('[title="Reset to server default"]').exists()).toBe(true)
    })

    it('emits empty string when clear is clicked', async () => {
      const w = mountSelect('America/Toronto')
      await w.find('[title="Reset to server default"]').trigger('mousedown')
      expect(w.emitted('update:modelValue')?.[0]).toEqual([''])
    })
  })

  describe('dropdown', () => {
    it('shows all zones on focus with no search', async () => {
      const w = mountSelect()
      await w.find('input').trigger('focus')
      await flushPromises()
      expect(w.text()).toContain('America/Toronto')
      expect(w.text()).toContain('Europe/London')
    })

    it('emits update:modelValue with selected zone', async () => {
      const w = mountSelect()
      await w.find('input').trigger('focus')
      await flushPromises()
      const btn = w.findAll('button').find(b => b.text().includes('America/Toronto'))!
      await btn.trigger('mousedown')
      expect(w.emitted('update:modelValue')?.[0]).toEqual(['America/Toronto'])
    })

    it('shows chevron-up icon when open', async () => {
      const w = mountSelect()
      await w.find('input').trigger('focus')
      const chevrons = w.findAll('[data-icon]').filter(el => el.attributes('data-icon')?.includes('chevron'))
      expect(chevrons.some(el => el.attributes('data-icon') === 'chevron-up')).toBe(true)
    })

    it('shows chevron-down icon when closed', () => {
      const w = mountSelect()
      const chevrons = w.findAll('[data-icon]').filter(el => el.attributes('data-icon')?.includes('chevron'))
      expect(chevrons.some(el => el.attributes('data-icon') === 'chevron-down')).toBe(true)
    })
  })

  describe('fuzzy filtering', () => {
    it('filters results when typing', async () => {
      const w = mountSelect()
      await w.find('input').trigger('focus')
      await w.find('input').setValue('toronto')
      await flushPromises()
      expect(w.text()).toContain('America/Toronto')
      expect(w.text()).not.toContain('Europe/London')
    })

    it('is case-insensitive', async () => {
      const w = mountSelect()
      await w.find('input').trigger('focus')
      await w.find('input').setValue('TORONTO')
      await flushPromises()
      expect(w.text()).toContain('America/Toronto')
    })

    it('shows no matching message when nothing matches', async () => {
      const w = mountSelect()
      await w.find('input').trigger('focus')
      await w.find('input').setValue('zzznomatch')
      await flushPromises()
      expect(w.text()).toContain('No matching timezone')
    })

    it('fuzzy matches non-contiguous characters', async () => {
      const w = mountSelect()
      await w.find('input').trigger('focus')
      // 'atrto' matches America/Toronto
      await w.find('input').setValue('atrto')
      await flushPromises()
      expect(w.text()).toContain('America/Toronto')
    })

    it('highlights matched characters with accent class', async () => {
      const w = mountSelect()
      await w.find('input').trigger('focus')
      await w.find('input').setValue('Toronto')
      await flushPromises()
      const highlighted = w.findAll('span.font-semibold')
      expect(highlighted.length).toBeGreaterThan(0)
    })
  })

  describe('GMT offset', () => {
    it('shows offset alongside zone name in dropdown', async () => {
      const w = mountSelect()
      await w.find('input').trigger('focus')
      await flushPromises()
      // Should show something like GMT-4 or GMT+0 next to each zone
      const text = w.text()
      expect(text).toMatch(/GMT[+-]\d/)
    })
  })
})
