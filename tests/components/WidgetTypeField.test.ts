// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { globalStubs } from './helpers'

vi.stubGlobal('widgetDefinitions', {
  sonarr: { name: 'Sonarr', authType: 'apiKey', fields: [{ label: 'Wanted', desc: '' }] },
  pihole: { name: 'Pi-hole', authType: 'basic', fields: [] },
  radarr: { name: 'Radarr', authType: 'apiKey', fields: [] },
})

import WidgetTypeField from '~/components/edit/modal/WidgetTypeField.vue'

function mountField(modelValue = '') {
  return mount(WidgetTypeField, {
    props: { modelValue },
    global: { stubs: globalStubs },
  })
}

describe('WidgetTypeField.vue — dropdown', () => {
  it('shows chevron-down icon when dropdown is closed', () => {
    const wrapper = mountField()
    const icon = wrapper.find('[data-icon="chevron-down"]')
    expect(icon.exists()).toBe(true)
  })

  it('shows chevron-up icon when dropdown is open', async () => {
    const wrapper = mountField()
    await wrapper.find('input').trigger('focus')
    expect(wrapper.find('[data-icon="chevron-up"]').exists()).toBe(true)
    expect(wrapper.find('[data-icon="chevron-down"]').exists()).toBe(false)
  })

  it('shows chevron-down again after selecting a widget', async () => {
    const wrapper = mountField()
    await wrapper.find('input').trigger('focus')
    const sonarrBtn = wrapper.findAll('button').find(b => b.text().includes('sonarr'))
    await sonarrBtn!.trigger('mousedown')
    expect(wrapper.find('[data-icon="chevron-down"]').exists()).toBe(true)
  })

  it('shows all widget entries on focus', async () => {
    const wrapper = mountField()
    await wrapper.find('input').trigger('focus')
    const items = wrapper.findAll('span.font-mono')
    expect(items.map(i => i.text())).toContain('sonarr')
    expect(items.map(i => i.text())).toContain('pihole')
    expect(items.map(i => i.text())).toContain('radarr')
  })

  it('filters entries by search query', async () => {
    const wrapper = mountField()
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('son')
    await input.trigger('input')
    const items = wrapper.findAll('span.font-mono')
    expect(items.map(i => i.text())).toContain('sonarr')
    expect(items.map(i => i.text())).not.toContain('pihole')
  })

  it('shows no-match message when query has no results', async () => {
    const wrapper = mountField()
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('zzznomatch')
    await input.trigger('input')
    expect(wrapper.text()).toContain('No matching widget')
  })

  it('emits update:modelValue when a widget is selected', async () => {
    const wrapper = mountField()
    await wrapper.find('input').trigger('focus')
    const sonarrBtn = wrapper.findAll('button').find(b => b.text().includes('sonarr'))
    await sonarrBtn!.trigger('mousedown')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['sonarr'])
  })

  it('closes dropdown on Escape', async () => {
    const wrapper = mountField()
    await wrapper.find('input').trigger('focus')
    expect(wrapper.find('[data-icon="chevron-up"]').exists()).toBe(true)
    await wrapper.find('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-icon="chevron-down"]').exists()).toBe(true)
  })

  it('shows auth type badge for selected widget when dropdown is closed', async () => {
    const wrapper = mountField('sonarr')
    await flushPromises()
    expect(wrapper.text()).toContain('apiKey')
  })

  it('dropdown list has overscroll-contain class', async () => {
    const wrapper = mountField()
    await wrapper.find('input').trigger('focus')
    const dropdown = wrapper.find('.overscroll-contain')
    expect(dropdown.exists()).toBe(true)
  })
})
