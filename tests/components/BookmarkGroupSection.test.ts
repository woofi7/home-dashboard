// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('useLayoutSettings', () => ({
  containerStyle: computed(() => ({ display: 'flex', flexWrap: 'wrap' as const })),
  itemStyle: computed(() => ({ flex: '1 1 80px', minWidth: 0 })),
  effective: computed(() => ({})),
}))

vi.stubGlobal('useFetch', () => ({ data: { value: {} }, refresh: vi.fn() }))

import BookmarkGroupSection from '~/components/layout/BookmarkGroupSection.vue'

const defaultGroup = {
  name: 'Links',
  bookmarks: [
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'HN', url: 'https://news.ycombinator.com' },
  ],
}

const stubs = {
  ...globalStubs,
  BookmarkItem: { template: '<div class="bookmark-item-stub" />', props: ['bookmark', 'edit', 'pending', 'pendingDelete', 'dragging', 'clickCount'] },
}

function mountSection(opts: { edit?: boolean; group?: typeof defaultGroup } = {}) {
  return mount(BookmarkGroupSection, {
    props: {
      group: opts.group ?? defaultGroup,
      edit: opts.edit ?? false,
    },
    global: { stubs },
  })
}

describe('BookmarkGroupSection.vue', () => {
  it('shows group name', () => {
    expect(mountSection().text()).toContain('Links')
  })

  it('renders a BookmarkItem for each bookmark', () => {
    const w = mountSection()
    expect(w.findAll('.bookmark-item-stub').length).toBe(2)
  })

  it('does not show Add button when edit=false', () => {
    const w = mountSection({ edit: false })
    expect(w.findAll('button').some(b => b.text().includes('Add'))).toBe(false)
  })

  it('shows Add button when edit=true', () => {
    const w = mountSection({ edit: true })
    expect(w.findAll('button').some(b => b.text().includes('Add'))).toBe(true)
  })

  it('shows Remove button when edit=true', () => {
    const w = mountSection({ edit: true })
    expect(w.findAll('button').some(b => b.text() === 'Remove')).toBe(true)
  })

  it('clicking Remove emits delete', async () => {
    const w = mountSection({ edit: true })
    await w.findAll('button').find(b => b.text() === 'Remove')!.trigger('click')
    expect(w.emitted('delete')).toBeTruthy()
  })

  it('Add button uses white-alpha border and background for visibility over backgrounds', () => {
    const w = mountSection({ edit: true })
    const addBtn = w.findAll('button').find(b => b.text().includes('Add'))!
    expect(addBtn.classes()).toContain('border-white/30')
    expect(addBtn.classes()).toContain('bg-black/20')
    expect(addBtn.classes()).not.toContain('border-border')
    expect(addBtn.classes()).not.toContain('text-muted')
  })

  it('shows grip handle when edit=true', () => {
    const w = mountSection({ edit: true })
    expect(w.find('.section-handle').exists()).toBe(true)
  })

  it('does not show grip handle when edit=false', () => {
    const w = mountSection({ edit: false })
    expect(w.find('.section-handle').exists()).toBe(false)
  })
})
