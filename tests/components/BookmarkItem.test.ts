// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { globalStubs } from './helpers'

const globalSettingsData = ref<{ linkTarget?: 'new-tab' | 'same-tab' }>({})
vi.stubGlobal('useGlobalSettings', () => ({ settings: computed(() => globalSettingsData.value) }))

import BookmarkItem from '~/components/layout/BookmarkItem.vue'

type Bookmark = { name: string; url: string; icon?: string }

function mountItem(bookmark: Bookmark, overrides: { edit?: boolean; clickCount?: number } = {}) {
  return mount(BookmarkItem, {
    props: {
      bookmark,
      edit: overrides.edit ?? false,
      pending: false,
      pendingDelete: false,
      dragging: false,
      clickCount: overrides.clickCount,
    },
    global: { stubs: globalStubs },
  })
}

describe('BookmarkItem.vue — Link target', () => {
  beforeEach(() => {
    globalSettingsData.value = {}
  })

  it('renders as an anchor when not in edit mode', () => {
    const wrapper = mountItem({ name: 'GitHub', url: 'https://github.com' })
    expect(wrapper.element.tagName).toBe('A')
  })

  it('renders as a div in edit mode (no link)', () => {
    const wrapper = mountItem({ name: 'GitHub', url: 'https://github.com' }, { edit: true })
    expect(wrapper.element.tagName).toBe('DIV')
  })

  it('opens in new tab by default', () => {
    globalSettingsData.value = {}
    const wrapper = mountItem({ name: 'GitHub', url: 'https://github.com' })
    expect(wrapper.element.getAttribute('target')).toBe('_blank')
  })

  it('opens in new tab when linkTarget is new-tab', () => {
    globalSettingsData.value = { linkTarget: 'new-tab' }
    const wrapper = mountItem({ name: 'GitHub', url: 'https://github.com' })
    expect(wrapper.element.getAttribute('target')).toBe('_blank')
  })

  it('opens in same tab when linkTarget is same-tab', () => {
    globalSettingsData.value = { linkTarget: 'same-tab' }
    const wrapper = mountItem({ name: 'GitHub', url: 'https://github.com' })
    expect(wrapper.element.getAttribute('target')).toBe('_self')
  })

  it('displays the bookmark name', () => {
    const wrapper = mountItem({ name: 'GitHub', url: 'https://github.com' })
    expect(wrapper.text()).toContain('GitHub')
  })

  it('shows click count badge when clickCount is provided', () => {
    const wrapper = mountItem({ name: 'GitHub', url: 'https://github.com' }, { clickCount: 7 })
    expect(wrapper.text()).toContain('7')
  })
})

describe('BookmarkItem.vue — Settings page', () => {
  beforeEach(() => {
    globalSettingsData.value = {}
  })

  it('includes href pointing to the bookmark url', () => {
    const wrapper = mountItem({ name: 'Jira', url: 'https://jira.example.com' })
    expect(wrapper.element.getAttribute('href')).toBe('https://jira.example.com')
  })

  it('includes rel=noopener', () => {
    const wrapper = mountItem({ name: 'Jira', url: 'https://jira.example.com' })
    expect(wrapper.element.getAttribute('rel')).toBe('noopener')
  })
})
