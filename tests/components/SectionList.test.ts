// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { globalStubs } from './helpers'

import SectionList from '~/components/dashboard/SectionList.vue'

type SectionEntry = { type: 'service' | 'bookmark'; name: string }

const SERVICE_GROUP_STUB = {
  template: '<div class="service-group-stub">{{ group.name }}</div>',
  props: ['group', 'edit'],
  emits: ['update', 'dirty', 'delete'],
}
const BOOKMARK_GROUP_STUB = {
  template: '<div class="bookmark-group-stub">{{ group.name }}</div>',
  props: ['group', 'edit'],
  emits: ['update', 'dirty', 'delete'],
}

const stubs = {
  ...globalStubs,
  ServiceGroupSection: SERVICE_GROUP_STUB,
  BookmarkGroupSection: BOOKMARK_GROUP_STUB,
}

function makeConfig(services: string[] = [], bookmarks: string[] = []) {
  return {
    services: services.map(n => ({ name: n, services: [] })),
    bookmarks: bookmarks.map(n => ({ name: n, bookmarks: [] })),
    widgets: [],
    settings: {},
  }
}

function mountList(opts: {
  sectionOrder?: SectionEntry[]
  editActive?: boolean
  configLoaded?: boolean
  services?: string[]
  bookmarks?: string[]
} = {}) {
  const sectionOrder = opts.sectionOrder ?? []
  const config = makeConfig(opts.services ?? [], opts.bookmarks ?? [])
  return mount(SectionList, {
    props: {
      sectionOrder,
      localConfig: config,
      editActive: opts.editActive ?? false,
      configLoaded: opts.configLoaded ?? true,
    },
    global: { stubs },
  })
}

describe('SectionList.vue', () => {
  describe('loading state', () => {
    it('shows skeleton when configLoaded is false', () => {
      const w = mountList({ configLoaded: false })
      expect(w.find('.animate-pulse').exists()).toBe(true)
    })

    it('does not show skeleton when configLoaded is true', () => {
      const w = mountList({ configLoaded: true })
      expect(w.find('.animate-pulse').exists()).toBe(false)
    })
  })

  describe('empty state', () => {
    it('shows "No sections yet" when loaded and empty', () => {
      const w = mountList({ configLoaded: true, sectionOrder: [] })
      expect(w.text()).toContain('No sections yet')
    })

    it('shows add buttons in edit mode when empty', () => {
      const w = mountList({ configLoaded: true, sectionOrder: [], editActive: true })
      expect(w.text()).toContain('Service section')
      expect(w.text()).toContain('Bookmark group')
    })

    it('shows Edit button (not add buttons) when not in edit mode and empty', () => {
      const w = mountList({ configLoaded: true, sectionOrder: [], editActive: false })
      const buttons = w.findAll('button')
      expect(buttons.some(b => b.text() === 'Edit')).toBe(true)
      expect(buttons.some(b => b.text().includes('section') || b.text().includes('group'))).toBe(false)
    })

    it('emits request-edit when Edit button is clicked in empty state', async () => {
      const w = mountList({ configLoaded: true, sectionOrder: [], editActive: false })
      await w.findAll('button').find(b => b.text() === 'Edit')!.trigger('click')
      expect(w.emitted('request-edit')).toBeTruthy()
    })
  })

  describe('section rendering', () => {
    it('renders service group sections', () => {
      const w = mountList({
        sectionOrder: [{ type: 'service', name: 'Media' }],
        services: ['Media'],
      })
      expect(w.find('.service-group-stub').exists()).toBe(true)
      expect(w.text()).toContain('Media')
    })

    it('renders bookmark group sections', () => {
      const w = mountList({
        sectionOrder: [{ type: 'bookmark', name: 'Links' }],
        bookmarks: ['Links'],
      })
      expect(w.find('.bookmark-group-stub').exists()).toBe(true)
      expect(w.text()).toContain('Links')
    })

    it('skips sections whose group data is missing from config', () => {
      const w = mountList({
        sectionOrder: [{ type: 'service', name: 'Ghost' }],
        services: [],
      })
      expect(w.find('.service-group-stub').exists()).toBe(false)
    })
  })

  describe('add section buttons (non-empty list)', () => {
    it('shows add buttons at bottom in edit mode', () => {
      const w = mountList({
        sectionOrder: [{ type: 'service', name: 'Media' }],
        services: ['Media'],
        editActive: true,
      })
      const buttons = w.findAll('button').filter(b => b.text().includes('section') || b.text().includes('group'))
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('does not show add buttons when not editing', () => {
      const w = mountList({
        sectionOrder: [{ type: 'service', name: 'Media' }],
        services: ['Media'],
        editActive: false,
      })
      const buttons = w.findAll('button').filter(b => b.text().includes('section') || b.text().includes('group'))
      expect(buttons.length).toBe(0)
    })

    it('add buttons use palette-aware border', () => {
      const w = mountList({
        sectionOrder: [{ type: 'service', name: 'Media' }],
        services: ['Media'],
        editActive: true,
      })
      const buttons = w.findAll('button').filter(b => b.text().includes('section') || b.text().includes('group'))
      for (const btn of buttons) {
        expect(btn.classes()).toContain('border-border')
        expect(btn.classes()).not.toContain('border-white/30')
      }
    })

    it('empty-state add buttons use palette-aware border', () => {
      const w = mountList({ configLoaded: true, sectionOrder: [], editActive: true })
      const buttons = w.findAll('button').filter(b => b.text().includes('section') || b.text().includes('group'))
      for (const btn of buttons) {
        expect(btn.classes()).toContain('border-border')
        expect(btn.classes()).not.toContain('border-white/30')
      }
    })
  })

  describe('add group flow', () => {
    async function clickAddService(w: ReturnType<typeof mountList>) {
      const btn = w.findAll('button').find(b => b.text().includes('Service section'))!
      await btn.trigger('click')
    }
    async function clickAddBookmark(w: ReturnType<typeof mountList>) {
      const btn = w.findAll('button').find(b => b.text().includes('Bookmark group'))!
      await btn.trigger('click')
    }

    it('shows name input after clicking add service section (empty state)', async () => {
      const w = mountList({ configLoaded: true, sectionOrder: [], editActive: true })
      await clickAddService(w)
      expect(w.find('input').exists()).toBe(true)
      expect(w.find('input').attributes('placeholder')).toContain('Section name')
    })

    it('shows name input after clicking add bookmark group (empty state)', async () => {
      const w = mountList({ configLoaded: true, sectionOrder: [], editActive: true })
      await clickAddBookmark(w)
      expect(w.find('input').exists()).toBe(true)
      expect(w.find('input').attributes('placeholder')).toContain('Group name')
    })

    it('emits add-service-group on confirm', async () => {
      const w = mountList({ configLoaded: true, sectionOrder: [], editActive: true })
      await clickAddService(w)
      await w.find('input').setValue('My Section')
      await w.findAll('button').find(b => b.text() === 'Add')!.trigger('click')
      expect(w.emitted('add-service-group')).toBeTruthy()
      expect(w.emitted('add-service-group')![0]).toEqual(['My Section'])
    })

    it('emits add-bookmark-group on confirm', async () => {
      const w = mountList({ configLoaded: true, sectionOrder: [], editActive: true })
      await clickAddBookmark(w)
      await w.find('input').setValue('My Links')
      await w.findAll('button').find(b => b.text() === 'Add')!.trigger('click')
      expect(w.emitted('add-bookmark-group')).toBeTruthy()
      expect(w.emitted('add-bookmark-group')![0]).toEqual(['My Links'])
    })

    it('does not emit when name is blank', async () => {
      const w = mountList({ configLoaded: true, sectionOrder: [], editActive: true })
      await clickAddService(w)
      await w.findAll('button').find(b => b.text() === 'Add')!.trigger('click')
      expect(w.emitted('add-service-group')).toBeFalsy()
    })

    it('hides input after cancel', async () => {
      const w = mountList({ configLoaded: true, sectionOrder: [], editActive: true })
      await clickAddService(w)
      expect(w.find('input').exists()).toBe(true)
      await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
      expect(w.find('input').exists()).toBe(false)
    })

    it('emits add-service-group from bottom bar (non-empty list)', async () => {
      const w = mountList({
        sectionOrder: [{ type: 'service', name: 'Media' }],
        services: ['Media'],
        editActive: true,
      })
      await clickAddService(w)
      await w.find('input').setValue('Tools')
      await w.findAll('button').find(b => b.text() === 'Add')!.trigger('click')
      expect(w.emitted('add-service-group')![0]).toEqual(['Tools'])
    })

    it('rejects duplicate service group name and shows error', async () => {
      const w = mountList({
        configLoaded: true,
        sectionOrder: [],
        editActive: true,
        services: ['Media'],
      })
      await clickAddService(w)
      await w.find('input').setValue('Media')
      await w.findAll('button').find(b => b.text() === 'Add')!.trigger('click')
      expect(w.emitted('add-service-group')).toBeFalsy()
      expect(w.find('input').exists()).toBe(true)
      expect(w.text()).toContain('Name already used')
    })

    it('rejects duplicate bookmark group name and shows error', async () => {
      const w = mountList({
        configLoaded: true,
        sectionOrder: [],
        editActive: true,
        bookmarks: ['Links'],
      })
      await clickAddBookmark(w)
      await w.find('input').setValue('Links')
      await w.findAll('button').find(b => b.text() === 'Add')!.trigger('click')
      expect(w.emitted('add-bookmark-group')).toBeFalsy()
      expect(w.find('input').exists()).toBe(true)
      expect(w.text()).toContain('Name already used')
    })

    it('clears error when user types a new name', async () => {
      const w = mountList({
        configLoaded: true,
        sectionOrder: [],
        editActive: true,
        services: ['Media'],
      })
      await clickAddService(w)
      await w.find('input').setValue('Media')
      await w.findAll('button').find(b => b.text() === 'Add')!.trigger('click')
      expect(w.text()).toContain('Name already used')
      await w.find('input').trigger('keydown', { key: 'a' })
      expect(w.text()).not.toContain('Name already used')
    })

    it('allows duplicate name across type boundaries (service named same as bookmark)', async () => {
      const w = mountList({
        configLoaded: true,
        sectionOrder: [],
        editActive: true,
        services: ['wololo'],
        bookmarks: [],
      })
      await clickAddBookmark(w)
      await w.find('input').setValue('wololo')
      await w.findAll('button').find(b => b.text() === 'Add')!.trigger('click')
      expect(w.emitted('add-bookmark-group')?.[0]).toEqual(['wololo'])
      expect(w.text()).not.toContain('Name already used')
    })
  })
})
