// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('useLayoutSettings', () => ({
  containerStyle: computed(() => ({ display: 'flex', flexWrap: 'wrap' as const })),
  itemStyle: computed(() => ({ flex: '1 1 80px', minWidth: 0 })),
  effective: computed(() => ({})),
}))

function makeFetch(clicks: Record<string, number> = {}, autoSort = false) {
  return vi.fn((url: string) => {
    if (url === '/api/bookmarks/clicks')
      return { data: ref(clicks), refresh: vi.fn() }
    if (url === '/api/config')
      return { data: ref({ settings: { bookmarkCounterEnabled: true, bookmarkAutoSort: autoSort } }), refresh: vi.fn() }
    return { data: ref({}), refresh: vi.fn() }
  })
}

vi.stubGlobal('useFetch', makeFetch())

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

function mountSection(opts: { edit?: boolean; group?: typeof defaultGroup; clicks?: Record<string, number>; autoSort?: boolean } = {}) {
  vi.stubGlobal('useFetch', makeFetch(opts.clicks ?? {}, opts.autoSort ?? false))
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

  it('Add button uses palette-aware border', () => {
    const w = mountSection({ edit: true })
    const addBtn = w.findAll('button').find(b => b.text().includes('Add'))!
    expect(addBtn.classes()).toContain('border-border')
    expect(addBtn.classes()).not.toContain('border-white/30')
  })

  it('shows grip handle when edit=true', () => {
    const w = mountSection({ edit: true })
    expect(w.find('.section-handle').exists()).toBe(true)
  })

  it('does not show grip handle when edit=false', () => {
    const w = mountSection({ edit: false })
    expect(w.find('.section-handle').exists()).toBe(false)
  })

  it('shows pencil button next to group name in edit mode', () => {
    const w = mountSection({ edit: true })
    expect(w.findAll('button').some(b => b.find('[data-icon="pencil"]').exists())).toBe(true)
  })

  it('does not show pencil button when not editing', () => {
    const w = mountSection({ edit: false })
    expect(w.findAll('button').some(b => b.find('[data-icon="pencil"]').exists())).toBe(false)
  })

  it('clicking pencil shows name input with current name', async () => {
    const { nextTick } = await import('vue')
    const w = mountSection({ edit: true })
    const pencil = w.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!
    await pencil.trigger('click')
    await nextTick(); await nextTick()
    const input = w.find('input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Links')
  })

  it('confirming rename with Enter emits update with new name', async () => {
    const { nextTick } = await import('vue')
    const w = mountSection({ edit: true })
    const pencil = w.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!
    await pencil.trigger('click')
    await nextTick(); await nextTick()
    await w.find('input').setValue('Favorites')
    await w.find('input').trigger('keydown', { key: 'Enter' })
    const updates = w.emitted('update') as Array<[typeof defaultGroup]>
    expect(updates?.at(-1)?.[0].name).toBe('Favorites')
  })

  it('pressing Escape cancels rename without emitting', async () => {
    const { nextTick } = await import('vue')
    const w = mountSection({ edit: true })
    const emitsBefore = w.emitted('update')?.length ?? 0
    const pencil = w.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!
    await pencil.trigger('click')
    await nextTick(); await nextTick()
    await w.find('input').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(w.emitted('update')?.length ?? 0).toBe(emitsBefore)
    expect(w.find('input').exists()).toBe(false)
  })

  it('rejects duplicate name and shows error', async () => {
    const { nextTick } = await import('vue')
    const w = mount(BookmarkGroupSection, {
      props: { group: defaultGroup, edit: true, existingNames: ['Links', 'Favorites'] },
      global: { stubs },
    })
    const pencil = w.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!
    await pencil.trigger('click')
    await nextTick(); await nextTick()
    await w.find('input').setValue('Favorites')
    await w.find('input').trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(w.find('input').exists()).toBe(true)
    expect(w.text()).toContain('Name already used')
    expect(w.emitted('update')).toBeFalsy()
  })

  it('allows keeping the same name (no duplicate error)', async () => {
    const { nextTick } = await import('vue')
    const w = mount(BookmarkGroupSection, {
      props: { group: defaultGroup, edit: true, existingNames: ['Links', 'Favorites'] },
      global: { stubs },
    })
    const pencil = w.findAll('button').find(b => b.find('[data-icon="pencil"]').exists())!
    await pencil.trigger('click')
    await nextTick(); await nextTick()
    await w.find('input').setValue('Links')
    await w.find('input').trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(w.text()).not.toContain('Name already used')
  })

  describe('header border (title line)', () => {
    it('header has border-b border-border like service groups', () => {
      const w = mountSection()
      const header = w.find('.border-b.border-border')
      expect(header.exists()).toBe(true)
      expect(header.text()).toContain('Links')
    })
  })

  describe('collapse', () => {
    it('shows chevron-down toggle button', () => {
      const w = mountSection()
      expect(w.findAll('button').some(b => b.find('[data-icon="chevron-down"]').exists())).toBe(true)
    })

    it('content is visible by default', () => {
      const w = mountSection()
      expect(w.findAll('.bookmark-item-stub').length).toBe(2)
    })

    it('clicking collapse hides the bookmark items', async () => {
      const w = mountSection()
      const toggle = w.findAll('button').find(b => b.find('[data-icon="chevron-down"]').exists())!
      await toggle.trigger('click')
      const content = w.find('[style*="display: none"], [style*="display:none"]')
      expect(content.exists()).toBe(true)
    })

    it('clicking collapse twice restores visibility', async () => {
      const { nextTick } = await import('vue')
      const w = mountSection()
      const toggle = w.findAll('button').find(b => b.find('[data-icon="chevron-down"]').exists())!
      await toggle.trigger('click')
      await toggle.trigger('click')
      await nextTick()
      expect(w.findAll('.bookmark-item-stub').length).toBe(2)
    })

    it('collapse button is present in edit mode too', () => {
      const w = mountSection({ edit: true })
      expect(w.findAll('button').some(b => b.find('[data-icon="chevron-down"]').exists())).toBe(true)
    })
  })

  describe('auto-sort by click count', () => {
    it('sorts bookmarks by click count descending when autoSort is enabled', () => {
      const w = mountSection({ clicks: { GitHub: 2, HN: 10 }, autoSort: true })
      const itemProps = w.findAllComponents({ name: 'BookmarkItem' })
        .map(c => (c.props() as { bookmark: { name: string } }).bookmark?.name)
      if (itemProps.length > 0) {
        expect(itemProps[0]).toBe('HN')
        expect(itemProps[1]).toBe('GitHub')
      }
    })

    it('preserves original order when autoSort is disabled', () => {
      const w = mountSection({ clicks: { GitHub: 2, HN: 10 }, autoSort: false })
      const itemProps = w.findAllComponents({ name: 'BookmarkItem' })
        .map(c => (c.props() as { bookmark: { name: string } }).bookmark?.name)
      if (itemProps.length > 0) {
        expect(itemProps[0]).toBe('GitHub')
        expect(itemProps[1]).toBe('HN')
      }
    })

    it('preserves original order when all click counts are equal', () => {
      const w = mountSection({ clicks: {}, autoSort: true })
      const itemProps = w.findAllComponents({ name: 'BookmarkItem' })
        .map(c => (c.props() as { bookmark: { name: string } }).bookmark?.name)
      if (itemProps.length > 0) {
        expect(itemProps[0]).toBe('GitHub')
        expect(itemProps[1]).toBe('HN')
      }
    })

    it('does not sort in edit mode even when autoSort is enabled', () => {
      const w = mountSection({ edit: true, clicks: { GitHub: 2, HN: 10 }, autoSort: true })
      const itemProps = w.findAllComponents({ name: 'BookmarkItem' })
        .map(c => (c.props() as { bookmark: { name: string } }).bookmark?.name)
      if (itemProps.length > 0) {
        expect(itemProps[0]).toBe('GitHub')
        expect(itemProps[1]).toBe('HN')
      }
    })
  })
})
