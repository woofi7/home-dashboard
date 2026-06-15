// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useAuth', () => ({
  editEnabled: ref(true),
  needsLogin: ref(false),
}))

import AdminIndex from '~/pages/admin/index.vue'

function mountPage() {
  return mount(AdminIndex, {
    global: {
      stubs: {
        ...globalStubs,
        NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
        FaIcon: { template: '<span class="fa-icon" :data-icon="icon" />', props: ['icon'] },
      },
    },
  })
}

describe('admin/index.vue', () => {
  it('renders a Settings heading', () => {
    expect(mountPage().find('h1').text()).toBe('Settings')
  })

  it('renders 6 setting nav cards (links)', () => {
    expect(mountPage().findAll('a').length).toBe(6)
  })

  it('renders a General card linking to /admin/settings', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/settings')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('General')
  })

  it('uses gear icon for the General card', () => {
    expect(mountPage().findAll('.fa-icon').some(i => i.attributes('data-icon') === 'gear')).toBe(true)
  })

  it('renders an Appearance card linking to /admin/appearance', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/appearance')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('Appearance')
  })

  it('uses image icon for the Appearance card', () => {
    expect(mountPage().findAll('.fa-icon').some(i => i.attributes('data-icon') === 'image')).toBe(true)
  })

  it('renders a Service Fields card linking to /admin/service-fields', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/service-fields')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('Service Fields')
  })

  it('uses table-cells icon for the Service Fields card', () => {
    expect(mountPage().findAll('.fa-icon').some(i => i.attributes('data-icon') === 'table-cells')).toBe(true)
  })

  it('renders a Widgets card linking to /admin/widgets', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/widgets')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('Widgets')
  })

  it('uses sliders icon for the Widgets card', () => {
    expect(mountPage().findAll('.fa-icon').some(i => i.attributes('data-icon') === 'sliders')).toBe(true)
  })

  it('renders a Backup & Restore card linking to /admin/backup', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/backup')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('Backup')
  })

  it('uses file-zipper icon for the Backup & Restore card', () => {
    expect(mountPage().findAll('.fa-icon').some(i => i.attributes('data-icon') === 'file-zipper')).toBe(true)
  })

  it('nav cards are ordered alphabetically by title', () => {
    const links = mountPage().findAll('a')
    const titles = links.map(l => l.find('p').text())
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)))
  })
})
