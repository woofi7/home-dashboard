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

  it('Add button uses palette-aware border', () => {
    const wrapper = mountSection({ edit: true })
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add'))!
    expect(addBtn.classes()).toContain('border-border')
    expect(addBtn.classes()).not.toContain('border-white/30')
  })

  it('shows pencil button next to group name in edit mode', () => {
    const wrapper = mountSection({ edit: true })
    const pencil = wrapper.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())
    expect(pencil).toBeTruthy()
  })

  it('does not show pencil button when not editing', () => {
    const wrapper = mountSection({ edit: false })
    const pencil = wrapper.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())
    expect(pencil).toBeFalsy()
  })

  it('clicking pencil shows name input with current name', async () => {
    const { nextTick } = await import('vue')
    const wrapper = mountSection({ edit: true })
    const pencil = wrapper.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!
    await pencil.trigger('click')
    await nextTick(); await nextTick()
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Media')
  })

  it('confirming rename with Enter emits update with new name', async () => {
    const { nextTick } = await import('vue')
    const wrapper = mountSection({ edit: true })
    const pencil = wrapper.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!
    await pencil.trigger('click')
    await nextTick(); await nextTick()
    await wrapper.find('input').setValue('Arr')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    const updates = wrapper.emitted('update') as Array<[typeof defaultGroup]>
    expect(updates?.at(-1)?.[0].name).toBe('Arr')
  })

  it('pressing Escape cancels rename without emitting', async () => {
    const { nextTick } = await import('vue')
    const wrapper = mountSection({ edit: true })
    const emitsBefore = wrapper.emitted('update')?.length ?? 0
    const pencil = wrapper.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!
    await pencil.trigger('click')
    await nextTick(); await nextTick()
    await wrapper.find('input').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect((wrapper.emitted('update')?.length ?? 0)).toBe(emitsBefore)
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('rejects duplicate name and shows error', async () => {
    const { nextTick } = await import('vue')
    const wrapper = mount(ServiceGroupSection, {
      props: { group: defaultGroup, edit: true, existingNames: ['Media', 'Arr'] },
      global: { stubs },
    })
    const pencil = wrapper.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!
    await pencil.trigger('click')
    await nextTick(); await nextTick()
    await wrapper.find('input').setValue('Arr')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.text()).toContain('Name already used')
    expect(wrapper.emitted('update')).toBeFalsy()
  })

  it('allows keeping the same name (no duplicate error)', async () => {
    const { nextTick } = await import('vue')
    const wrapper = mount(ServiceGroupSection, {
      props: { group: defaultGroup, edit: true, existingNames: ['Media', 'Arr'] },
      global: { stubs },
    })
    const pencil = wrapper.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!
    await pencil.trigger('click')
    await nextTick(); await nextTick()
    await wrapper.find('input').setValue('Media')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(wrapper.text()).not.toContain('Name already used')
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

  describe('collapse', () => {
    it('shows chevron-down toggle button', () => {
      const wrapper = mountSection()
      expect(wrapper.findAll('button').some(b => b.find('[data-icon="chevron-down"]').exists())).toBe(true)
    })

    it('service cards are visible by default', () => {
      const wrapper = mountSection()
      expect(wrapper.findAll('.service-card-stub').length).toBe(1)
    })

    it('clicking collapse hides the service content', async () => {
      const wrapper = mountSection()
      const toggle = wrapper.findAll('button').find(b => b.find('[data-icon="chevron-down"]').exists())!
      await toggle.trigger('click')
      const hidden = wrapper.find('[style*="display: none"], [style*="display:none"]')
      expect(hidden.exists()).toBe(true)
    })

    it('clicking collapse twice restores visibility', async () => {
      const { nextTick } = await import('vue')
      const wrapper = mountSection()
      const toggle = wrapper.findAll('button').find(b => b.find('[data-icon="chevron-down"]').exists())!
      await toggle.trigger('click')
      await toggle.trigger('click')
      await nextTick()
      expect(wrapper.findAll('.service-card-stub').length).toBe(1)
    })

    it('collapse button is present in edit mode', () => {
      const wrapper = mountSection({ edit: true })
      expect(wrapper.findAll('button').some(b => b.find('[data-icon="chevron-down"]').exists())).toBe(true)
    })
  })
})
