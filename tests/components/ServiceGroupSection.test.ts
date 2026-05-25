// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('useLayoutSettings', () => ({
  containerStyle: computed(() => ({ display: 'flex', flexWrap: 'wrap' as const })),
  itemStyle: computed(() => ({ flex: '1 1 180px', minWidth: 0 })),
}))

import ServiceGroupSection from '~/components/layout/ServiceGroupSection.vue'

const defaultGroup = {
  name: 'Media',
  services: [{ name: 'Sonarr', url: 'http://sonarr' }],
}

const stubs = {
  ...globalStubs,
  ServiceModal: { template: '<div class="service-modal-stub" />', props: ['service', 'group'] },
}

function mountSection(overrides: { edit?: boolean; group?: typeof defaultGroup } = {}) {
  return mount(ServiceGroupSection, {
    props: {
      group: overrides.group ?? defaultGroup,
      edit: overrides.edit ?? false,
    },
    global: { stubs },
  })
}

describe('ServiceGroupSection.vue', () => {
  it('shows group name in header', () => {
    const wrapper = mountSection()
    expect(wrapper.text()).toContain('Media')
  })

  it('no grip handle when edit=false', () => {
    const wrapper = mountSection({ edit: false })
    expect(wrapper.find('.section-handle').exists()).toBe(false)
  })

  it('no Remove button when edit=false', () => {
    const wrapper = mountSection({ edit: false })
    expect(wrapper.findAll('button').some(b => b.text() === 'Remove')).toBe(false)
  })

  it('no Add button when edit=false', () => {
    const wrapper = mountSection({ edit: false })
    expect(wrapper.findAll('button').some(b => b.text().includes('Add'))).toBe(false)
  })

  it('grip handle shown when edit=true', () => {
    const wrapper = mountSection({ edit: true })
    expect(wrapper.find('.section-handle').exists()).toBe(true)
  })

  it('Remove button shown when edit=true', () => {
    const wrapper = mountSection({ edit: true })
    expect(wrapper.findAll('button').some(b => b.text() === 'Remove')).toBe(true)
  })

  it('Add button shown when edit=true', () => {
    const wrapper = mountSection({ edit: true })
    expect(wrapper.findAll('button').some(b => b.text().includes('Add'))).toBe(true)
  })

  it('clicking Remove emits delete', async () => {
    const wrapper = mountSection({ edit: true })
    const removeBtn = wrapper.findAll('button').find(b => b.text() === 'Remove')
    await removeBtn!.trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })

  it('ServiceCard stub rendered for each service in group', () => {
    const group = {
      name: 'Media',
      services: [
        { name: 'Sonarr', url: 'http://sonarr' },
        { name: 'Radarr', url: 'http://radarr' },
      ],
    }
    const wrapper = mountSection({ group })
    expect(wrapper.findAll('.service-card-stub').length).toBe(2)
  })

  it('clicking Add button shows ServiceModal', async () => {
    const wrapper = mountSection({ edit: true })
    expect(wrapper.find('.service-modal-stub').exists()).toBe(false)
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add'))
    await addBtn!.trigger('click')
    expect(wrapper.find('.service-modal-stub').exists()).toBe(true)
  })

  it('Add button uses white-alpha border and background for visibility over backgrounds', () => {
    const wrapper = mountSection({ edit: true })
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add'))!
    expect(addBtn.classes()).toContain('border-white/30')
    expect(addBtn.classes()).toContain('bg-black/20')
    expect(addBtn.classes()).not.toContain('border-border')
    expect(addBtn.classes()).not.toContain('text-muted')
  })

  it('after mount + nextTick, component has opacity-100 class', async () => {
    const { nextTick } = await import('vue')
    const wrapper = mountSection()
    // onMounted schedules nextTick(() => visible=true) — need multiple ticks
    await nextTick()
    await nextTick()
    await nextTick()
    // Use html() which always reflects current DOM
    expect(wrapper.html()).toContain('opacity-100')
  })
})
