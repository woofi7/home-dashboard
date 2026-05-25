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

  it('renders a Weather card linking to /admin/weather', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/weather')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('Weather')
  })

  it('uses cloud-sun-rain icon for the Weather card', () => {
    expect(mountPage().findAll('.fa-icon').some(i => i.attributes('data-icon') === 'cloud-sun-rain')).toBe(true)
  })

  it('renders a Widget Fields card linking to /admin/widgets', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/widgets')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('Widget Fields')
  })

  it('uses table-cells icon for the Widget Fields card', () => {
    expect(mountPage().findAll('.fa-icon').some(i => i.attributes('data-icon') === 'table-cells')).toBe(true)
  })

  it('renders a Google Calendar card linking to /admin/calendar', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/calendar')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('Google Calendar')
  })

  it('uses calendar-days icon for the Google Calendar card', () => {
    expect(mountPage().findAll('.fa-icon').some(i => i.attributes('data-icon') === 'calendar-days')).toBe(true)
  })

  it('renders 6 setting nav cards (links)', () => {
    expect(mountPage().findAll('a').length).toBe(6)
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
})
