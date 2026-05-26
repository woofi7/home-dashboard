// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'

import HealthcheckField from '~/components/edit/modal/HealthcheckField.vue'

function mountField(modelValue = '') {
  return mount(HealthcheckField, {
    props: { modelValue },
    global: { stubs: globalStubs },
  })
}

describe('HealthcheckField.vue — type buttons', () => {
  it('renders Auto, None, Docker, HTTP buttons', () => {
    const wrapper = mountField()
    const text = wrapper.text()
    expect(text).toContain('Auto')
    expect(text).toContain('None')
    expect(text).toContain('Docker')
    expect(text).toContain('HTTP')
  })

  it('Auto button is active when modelValue is empty', () => {
    const wrapper = mountField('')
    const auto = wrapper.findAll('button').find(b => b.text() === 'Auto')!
    expect(auto.classes()).toContain('bg-accent')
  })

  it('None button is active when modelValue is none', () => {
    const wrapper = mountField('none')
    const btn = wrapper.findAll('button').find(b => b.text() === 'None')!
    expect(btn.classes()).toContain('bg-accent')
  })

  it('Docker button is active when modelValue is docker', () => {
    const wrapper = mountField('docker')
    const btn = wrapper.findAll('button').find(b => b.text() === 'Docker')!
    expect(btn.classes()).toContain('bg-accent')
  })

  it('HTTP button is active when modelValue is http', () => {
    const wrapper = mountField('http')
    const btn = wrapper.findAll('button').find(b => b.text() === 'HTTP')!
    expect(btn.classes()).toContain('bg-accent')
  })

  it('HTTP button is active when modelValue is a custom URL', () => {
    const wrapper = mountField('http://custom/health')
    const btn = wrapper.findAll('button').find(b => b.text() === 'HTTP')!
    expect(btn.classes()).toContain('bg-accent')
  })
})

describe('HealthcheckField.vue — URL input visibility', () => {
  it('does not show URL input when type is Auto', () => {
    const wrapper = mountField('')
    expect(wrapper.find('input[type=url]').exists()).toBe(false)
  })

  it('does not show URL input when type is None', () => {
    const wrapper = mountField('none')
    expect(wrapper.find('input[type=url]').exists()).toBe(false)
  })

  it('does not show URL input when type is Docker', () => {
    const wrapper = mountField('docker')
    expect(wrapper.find('input[type=url]').exists()).toBe(false)
  })

  it('shows URL input when type is HTTP', () => {
    const wrapper = mountField('http')
    expect(wrapper.find('input[type=url]').exists()).toBe(true)
  })

  it('shows URL input pre-filled when modelValue is a custom URL', () => {
    const wrapper = mountField('http://custom/health')
    const input = wrapper.find('input[type=url]')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('http://custom/health')
  })

  it('URL input is empty when modelValue is plain http', () => {
    const wrapper = mountField('http')
    const input = wrapper.find('input[type=url]')
    expect((input.element as HTMLInputElement).value).toBe('')
  })
})

describe('HealthcheckField.vue — emit on type change', () => {
  it('clicking Auto emits empty string', async () => {
    const wrapper = mountField('docker')
    const auto = wrapper.findAll('button').find(b => b.text() === 'Auto')!
    await auto.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([''])
  })

  it('clicking None emits none', async () => {
    const wrapper = mountField('')
    const btn = wrapper.findAll('button').find(b => b.text() === 'None')!
    await btn.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['none'])
  })

  it('clicking Docker emits docker', async () => {
    const wrapper = mountField('')
    const btn = wrapper.findAll('button').find(b => b.text() === 'Docker')!
    await btn.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['docker'])
  })

  it('clicking HTTP emits http when no previous custom URL', async () => {
    const wrapper = mountField('')
    const btn = wrapper.findAll('button').find(b => b.text() === 'HTTP')!
    await btn.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['http'])
  })

  it('clicking HTTP preserves custom URL when already in HTTP mode with a custom URL', async () => {
    const wrapper = mountField('http://custom/health')
    const btn = wrapper.findAll('button').find(b => b.text() === 'HTTP')!
    await btn.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['http://custom/health'])
  })
})

describe('HealthcheckField.vue — emit on URL change', () => {
  it('typing a URL emits the custom URL', async () => {
    const wrapper = mountField('http')
    const input = wrapper.find('input[type=url]')
    await input.setValue('http://host/health')
    const emitted = wrapper.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual(['http://host/health'])
  })

  it('clearing the URL input emits http (use service URL)', async () => {
    const wrapper = mountField('http://custom/health')
    const input = wrapper.find('input[type=url]')
    await input.setValue('')
    const emitted = wrapper.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual(['http'])
  })
})
