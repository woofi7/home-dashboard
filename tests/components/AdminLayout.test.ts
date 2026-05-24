// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { globalStubs } from './helpers'

import AdminLayout from '~/layouts/admin.vue'

const stubs = {
  ...globalStubs,
  NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
}

function mountLayout(path: string) {
  vi.stubGlobal('useRoute', () => ({ path }))
  return mount(AdminLayout, {
    global: { stubs },
    slots: { default: '<div class="page-content" />' },
  })
}

describe('AdminLayout.vue', () => {
  it('renders Dashboard link to /', () => {
    const wrapper = mountLayout('/admin')
    const links = wrapper.findAll('a')
    expect(links.some(l => l.attributes('href') === '/' && l.text() === 'Dashboard')).toBe(true)
  })

  it('renders Admin link to /admin', () => {
    const wrapper = mountLayout('/admin')
    const links = wrapper.findAll('a')
    expect(links.some(l => l.attributes('href') === '/admin' && l.text() === 'Admin')).toBe(true)
  })

  it('shows no extra crumb on /admin', () => {
    const wrapper = mountLayout('/admin')
    expect(wrapper.text()).not.toContain('/ Admin /')
  })

  it('shows Widgets crumb on /admin/widgets', () => {
    const wrapper = mountLayout('/admin/widgets')
    expect(wrapper.text()).toContain('Widgets')
  })

  it('shows Background crumb on /admin/background', () => {
    const wrapper = mountLayout('/admin/background')
    expect(wrapper.text()).toContain('Background')
  })

  it('capitalizes the crumb segment', () => {
    const wrapper = mountLayout('/admin/widgets')
    const crumbs = wrapper.findAll('span')
    expect(crumbs.some(s => s.text() === 'Widgets')).toBe(true)
  })

  it('renders the default slot', () => {
    const wrapper = mountLayout('/admin')
    expect(wrapper.find('.page-content').exists()).toBe(true)
  })

  it('renders the #admin-header-actions portal target', () => {
    const wrapper = mountLayout('/admin')
    expect(wrapper.find('#admin-header-actions').exists()).toBe(true)
  })
})
