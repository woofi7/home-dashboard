// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import YamlFilePreview from '~/components/admin/YamlFilePreview.vue'

const stubs = {
  FaIcon: { template: '<span class="fa-icon" :data-icon="icon" />', props: ['icon', 'spin'] },
}

function mountPreview(props: { filename: string; content?: string; loading?: boolean; error?: string } = { filename: 'services.yaml' }) {
  return mount(YamlFilePreview, { global: { stubs }, props })
}

describe('YamlFilePreview', () => {
  it('renders the filename', () => {
    const w = mountPreview({ filename: 'services.yaml' })
    expect(w.text()).toContain('services.yaml')
  })

  it('shows a Preview button by default', () => {
    const w = mountPreview({ filename: 'services.yaml' })
    expect(w.findAll('button').some(b => b.text() === 'Preview')).toBe(true)
  })

  it('does not show file content panel when closed', () => {
    const w = mountPreview({ filename: 'services.yaml', content: 'yaml content' })
    expect(w.text()).not.toContain('yaml content')
  })

  it('shows file content after clicking Preview', async () => {
    const w = mountPreview({ filename: 'services.yaml', content: '- name: Media\n' })
    await w.find('button').trigger('click')
    expect(w.text()).toContain('- name: Media')
  })

  it('shows Hide button after clicking Preview', async () => {
    const w = mountPreview({ filename: 'services.yaml' })
    await w.find('button').trigger('click')
    expect(w.findAll('button').some(b => b.text() === 'Hide')).toBe(true)
  })

  it('emits load event when Preview is clicked', async () => {
    const w = mountPreview({ filename: 'services.yaml' })
    await w.find('button').trigger('click')
    expect(w.emitted('load')).toBeTruthy()
  })

  it('does not emit load when Hide is clicked', async () => {
    const w = mountPreview({ filename: 'services.yaml', content: 'data' })
    await w.find('button').trigger('click')
    const loadCount = w.emitted('load')?.length ?? 0
    await w.find('button').trigger('click')
    expect(w.emitted('load')?.length ?? 0).toBe(loadCount)
  })

  it('clicking Hide hides the content panel', async () => {
    const w = mountPreview({ filename: 'services.yaml', content: 'visible content' })
    await w.find('button').trigger('click')
    expect(w.text()).toContain('visible content')
    await w.find('button').trigger('click')
    expect(w.text()).not.toContain('visible content')
  })

  it('shows Loading... when loading prop is true and open', async () => {
    const w = mountPreview({ filename: 'services.yaml', loading: true })
    await w.find('button').trigger('click')
    expect(w.text()).toContain('Loading...')
  })

  it('shows error message when error prop is set and open', async () => {
    const w = mountPreview({ filename: 'services.yaml', error: 'Not found' })
    await w.find('button').trigger('click')
    expect(w.text()).toContain('Not found')
  })

  it('renders default slot content', () => {
    const w = mount(YamlFilePreview, {
      global: { stubs },
      props: { filename: 'services.yaml' },
      slots: { default: '<span class="date-slot">May 28</span>' },
    })
    expect(w.find('.date-slot').exists()).toBe(true)
  })

  it('renders actions slot content', () => {
    const w = mount(YamlFilePreview, {
      global: { stubs },
      props: { filename: 'services.yaml' },
      slots: { actions: '<button class="restore-btn">Restore</button>' },
    })
    expect(w.find('.restore-btn').exists()).toBe(true)
  })
})
