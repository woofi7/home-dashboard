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

describe('BookmarkItem.vue — Edit mode buttons', () => {
  it('shows edit (pencil) button in edit mode when not pendingDelete', () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: false, dragging: false },
      global: { stubs: globalStubs },
    })
    expect(wrapper.findAll('button').some(b => b.find('[data-icon="pencil"]').exists())).toBe(true)
  })

  it('shows delete (xmark) button in edit mode when not pendingDelete', () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: false, dragging: false },
      global: { stubs: globalStubs },
    })
    expect(wrapper.findAll('button').some(b => b.find('[data-icon="xmark"]').exists())).toBe(true)
  })

  it('pencil button emits edit', async () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: false, dragging: false },
      global: { stubs: globalStubs },
    })
    await wrapper.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!.trigger('click')
    expect(wrapper.emitted('edit')).toBeTruthy()
  })

  it('xmark button emits delete', async () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: false, dragging: false },
      global: { stubs: globalStubs },
    })
    await wrapper.findAll('button').find(b => b.find('[data-icon="xmark"]').exists())!.trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })

  it('shows revert button when pending=true', () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: true, pendingDelete: false, dragging: false },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('Revert')
  })

  it('revert button emits restore', async () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: true, pendingDelete: false, dragging: false },
      global: { stubs: globalStubs },
    })
    await wrapper.findAll('button').find(b => b.text().includes('Revert'))!.trigger('click')
    expect(wrapper.emitted('restore')).toBeTruthy()
  })

  it('shows Restore button when pendingDelete=true', () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: true, dragging: false },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('Restore')
  })

  it('Restore button emits restore when pendingDelete=true', async () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: true, dragging: false },
      global: { stubs: globalStubs },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('restore')).toBeTruthy()
  })

  it('does not show pencil/xmark buttons when pendingDelete=true', () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: true, dragging: false },
      global: { stubs: globalStubs },
    })
    expect(wrapper.findAll('button').some(b => b.find('[data-icon="pencil"]').exists())).toBe(false)
    expect(wrapper.findAll('button').some(b => b.find('[data-icon="xmark"]').exists())).toBe(false)
  })

  it('no edit buttons when edit=false', () => {
    const wrapper = mountItem({ name: 'GitHub', url: 'https://github.com' })
    expect(wrapper.findAll('button').length).toBe(0)
  })
})

describe('BookmarkItem.vue — Drag handle', () => {
  it('shows handle when edit=true and not pendingDelete', () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: false, dragging: false },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.bookmark-handle').exists()).toBe(true)
  })

  it('does not show handle when edit=false', () => {
    const wrapper = mountItem({ name: 'GitHub', url: 'https://github.com' })
    expect(wrapper.find('.bookmark-handle').exists()).toBe(false)
  })

  it('does not show handle when pendingDelete=true', () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: true, dragging: false },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.bookmark-handle').exists()).toBe(false)
  })

  it('handle has hover background class', () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: false, dragging: false },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.bookmark-handle').classes()).toContain('hover:bg-elevated')
  })

  it('handle has hover text class', () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: false, dragging: false },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.bookmark-handle').classes()).toContain('hover:text-primary')
  })

  it('handle has transition-opacity for show/hide animation', () => {
    const wrapper = mount(BookmarkItem, {
      props: { bookmark: { name: 'GitHub', url: 'https://github.com' }, edit: true, pending: false, pendingDelete: false, dragging: false },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.bookmark-handle').classes()).toContain('transition-opacity')
  })
})
