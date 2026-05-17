// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'
import SectionLayoutSettings from '~/components/layout/SectionLayoutSettings.vue'

type LayoutSettings = {
  columns?: number
  gap?: 'tight' | 'normal' | 'loose'
  justify?: 'start' | 'center' | 'end' | 'between'
  mobile?: {
    columns?: number
    gap?: 'tight' | 'normal' | 'loose'
    justify?: 'start' | 'center' | 'end' | 'between'
  }
}

function mountSettings(modelValue: LayoutSettings = {}) {
  return mount(SectionLayoutSettings, {
    props: { modelValue },
    global: { stubs: globalStubs },
  })
}

describe('SectionLayoutSettings.vue', () => {
  it('panel is closed initially', () => {
    const wrapper = mountSettings()
    expect(wrapper.find('.fixed.z-50').exists()).toBe(false)
  })

  it('clicking the table-columns icon button opens the panel', async () => {
    const wrapper = mountSettings()
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.fixed.z-50').exists()).toBe(true)
  })

  it('clicking again closes the panel', async () => {
    const wrapper = mountSettings()
    const btn = wrapper.find('button')
    await btn.trigger('click')
    await btn.trigger('click')
    expect(wrapper.find('.fixed.z-50').exists()).toBe(false)
  })

  it('Desktop tab is active by default', async () => {
    const wrapper = mountSettings()
    await wrapper.find('button').trigger('click')
    const tabs = wrapper.findAll('.flex.gap-1.mb-3 button')
    expect(tabs[0].classes()).toContain('bg-elevated')
    expect(tabs[1].classes()).not.toContain('bg-elevated')
  })

  it('clicking Mobile tab switches to mobile view', async () => {
    const wrapper = mountSettings()
    await wrapper.find('button').trigger('click')
    await wrapper.findAll('.flex.gap-1.mb-3 button')[1].trigger('click')
    const tabs = wrapper.findAll('.flex.gap-1.mb-3 button')
    expect(tabs[1].classes()).toContain('bg-elevated')
    expect(tabs[0].classes()).not.toContain('bg-elevated')
  })

  it('in desktop view: clicking column button "4" emits update:modelValue with columns: 4', async () => {
    const wrapper = mountSettings({ columns: 2 })
    await wrapper.find('button').trigger('click')
    // Find the column buttons — they include "Auto", 1, 2, 3, 4, 5, 6, 8
    const colButtons = wrapper.findAll('.flex.gap-1.flex-wrap button')
    const btn4 = colButtons.find(b => b.text() === '4')
    await btn4!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const [val] = emitted![emitted!.length - 1] as [LayoutSettings]
    expect(val.columns).toBe(4)
  })

  it('in desktop view: clicking "Auto" emits with columns: undefined', async () => {
    const wrapper = mountSettings({ columns: 3 })
    await wrapper.find('button').trigger('click')
    const colButtons = wrapper.findAll('.flex.gap-1.flex-wrap button')
    const autoBtn = colButtons.find(b => b.text() === 'Auto')
    await autoBtn!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')!
    const [val] = emitted[emitted.length - 1] as [LayoutSettings]
    expect(val.columns).toBeUndefined()
  })

  it('in desktop view: clicking "Tight" gap emits with gap: tight', async () => {
    const wrapper = mountSettings({})
    await wrapper.find('button').trigger('click')
    // Find Tight button by text across all buttons in the panel
    const allButtons = wrapper.findAll('button')
    const tightBtn = allButtons.find(b => b.text() === 'Tight')
    expect(tightBtn).toBeTruthy()
    await tightBtn!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')!
    const [val] = emitted[emitted.length - 1] as [LayoutSettings]
    expect(val.gap).toBe('tight')
  })

  it('in desktop view: clicking "Center" justify emits with justify: center', async () => {
    const wrapper = mountSettings({})
    await wrapper.find('button').trigger('click')
    const justifyButtons = wrapper.findAll('div:last-child .flex.gap-1 button')
    const centerBtn = justifyButtons.find(b => b.text() === 'Center')
    await centerBtn!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')!
    const [val] = emitted[emitted.length - 1] as [LayoutSettings]
    expect(val.justify).toBe('center')
  })

  it('in mobile view: clicking column "1" emits with mobile: { columns: 1 }', async () => {
    const wrapper = mountSettings({})
    await wrapper.find('button').trigger('click')
    // Switch to mobile
    const tabs = wrapper.findAll('.flex.gap-1.mb-3 button')
    await tabs[1].trigger('click')
    const colButtons = wrapper.findAll('.flex.gap-1.flex-wrap button')
    const btn1 = colButtons.find(b => b.text() === '1')
    await btn1!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')!
    const [val] = emitted[emitted.length - 1] as [LayoutSettings]
    expect(val.mobile?.columns).toBe(1)
  })

  it('active column button has bg-accent class matching current value', async () => {
    const wrapper = mountSettings({ columns: 3 })
    await wrapper.find('button').trigger('click')
    const colButtons = wrapper.findAll('.flex.gap-1.flex-wrap button')
    const btn3 = colButtons.find(b => b.text() === '3')
    expect(btn3!.classes()).toContain('bg-accent')
  })

  it('active gap button has bg-accent class matching current value', async () => {
    const wrapper = mountSettings({ gap: 'loose' })
    await wrapper.find('button').trigger('click')
    // Find gap buttons
    const allButtons = wrapper.findAll('button')
    const looseBtn = allButtons.find(b => b.text() === 'Loose')
    expect(looseBtn!.classes()).toContain('bg-accent')
  })
})
