// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import OptionPicker from '~/components/admin/OptionPicker.vue'

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
]

function mountPicker(modelValue: string, size?: 'sm' | 'md') {
  return mount(OptionPicker, { props: { modelValue, options: OPTIONS, size } })
}

describe('OptionPicker.vue', () => {
  it('renders a button for each option', () => {
    const w = mountPicker('a')
    expect(w.findAll('button').length).toBe(3)
    expect(w.text()).toContain('Option A')
    expect(w.text()).toContain('Option B')
    expect(w.text()).toContain('Option C')
  })

  it('highlights the active option with accent classes', () => {
    const w = mountPicker('b')
    const active = w.findAll('button').find(b => b.text() === 'Option B')
    expect(active?.classes()).toContain('text-accent')
  })

  it('does not highlight inactive options', () => {
    const w = mountPicker('a')
    const inactive = w.findAll('button').find(b => b.text() === 'Option B')
    expect(inactive?.classes()).not.toContain('text-accent')
  })

  it('emits update:modelValue with the clicked value', async () => {
    const w = mountPicker('a')
    await w.findAll('button')[1].trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['b'])
  })

  it('applies sm size classes when size is sm', () => {
    const w = mountPicker('a', 'sm')
    const btn = w.findAll('button')[0]
    expect(btn.classes()).toContain('text-xs')
    expect(btn.classes()).toContain('px-3')
  })

  it('applies md size classes when size is md', () => {
    const w = mountPicker('a', 'md')
    const btn = w.findAll('button')[0]
    expect(btn.classes()).toContain('text-sm')
    expect(btn.classes()).toContain('px-4')
  })

  it('container uses flex-wrap so buttons wrap on small screens', () => {
    const w = mountPicker('a')
    expect(w.find('div').classes()).toContain('flex-wrap')
  })
})
