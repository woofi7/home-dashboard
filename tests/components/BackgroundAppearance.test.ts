// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BackgroundAppearance from '~/components/admin/BackgroundAppearance.vue'

const OPTION_PICKER_STUB = {
  template: '<div class="option-picker"><button v-for="opt in options" :key="opt.value" :class="{ active: modelValue === opt.value }" @click="$emit(\'update:modelValue\', opt.value)">{{ opt.label }}</button></div>',
  props: ['modelValue', 'options', 'size'],
  emits: ['update:modelValue'],
}

function baseForm() {
  return { position: 'center', overlay: 40, blur: 'none', fadeSpeed: 'normal' }
}

function mountApp(overrides: Partial<ReturnType<typeof baseForm>> = {}) {
  return mount(BackgroundAppearance, {
    props: { modelValue: { ...baseForm(), ...overrides } },
    global: { stubs: { OptionPicker: OPTION_PICKER_STUB } },
  })
}

describe('BackgroundAppearance.vue', () => {
  it('renders Appearance heading', () => {
    const w = mountApp()
    expect(w.text()).toContain('Appearance')
  })

  describe('position', () => {
    it('renders all position options', () => {
      const w = mountApp()
      for (const label of ['Center', 'Top', 'Bottom', 'Left', 'Right']) {
        expect(w.text()).toContain(label)
      }
    })

    it('emits position change', async () => {
      const w = mountApp({ position: 'center' })
      await w.findAll('button').find(b => b.text() === 'Top')!.trigger('click')
      const emitted = w.emitted('update:modelValue') as [{ position: string }][]
      expect(emitted?.[0]?.[0]?.position).toBe('top')
    })

    it('preserves other fields on position change', async () => {
      const w = mountApp({ position: 'center', overlay: 60 })
      await w.findAll('button').find(b => b.text() === 'Top')!.trigger('click')
      const emitted = w.emitted('update:modelValue') as [{ overlay: number }][]
      expect(emitted?.[0]?.[0]?.overlay).toBe(60)
    })
  })

  describe('overlay', () => {
    it('shows current overlay value', () => {
      const w = mountApp({ overlay: 55 })
      expect(w.text()).toContain('55%')
    })

    it('emits overlay change', async () => {
      const w = mountApp()
      const slider = w.find('input[type="range"]')
      await slider.setValue('60')
      const emitted = w.emitted('update:modelValue') as [{ overlay: number }][]
      expect(emitted?.[0]?.[0]?.overlay).toBe(60)
    })
  })

  describe('blur', () => {
    it('renders all blur options', () => {
      const w = mountApp()
      for (const label of ['None', 'Light', 'Medium', 'Heavy']) {
        expect(w.text()).toContain(label)
      }
    })

    it('emits blur change', async () => {
      const w = mountApp({ blur: 'none' })
      await w.findAll('button').find(b => b.text() === 'Heavy')!.trigger('click')
      const emitted = w.emitted('update:modelValue') as [{ blur: string }][]
      expect(emitted?.[0]?.[0]?.blur).toBe('lg')
    })
  })

  describe('fade speed', () => {
    it('renders all speed options', () => {
      const w = mountApp()
      for (const label of ['None', 'Fast', 'Normal', 'Slow']) {
        expect(w.text()).toContain(label)
      }
    })

    it('emits fadeSpeed change', async () => {
      const w = mountApp({ fadeSpeed: 'normal' })
      await w.findAll('button').find(b => b.text() === 'Fast')!.trigger('click')
      const emitted = w.emitted('update:modelValue') as [{ fadeSpeed: string }][]
      expect(emitted?.[0]?.[0]?.fadeSpeed).toBe('fast')
    })
  })
})
