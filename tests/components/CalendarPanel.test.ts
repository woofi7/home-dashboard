// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'

import CalendarPanel from '~/components/dashboard/CalendarPanel.vue'

type CalEvent = { id: string; summary: string; url: string; start?: string; end?: string; color?: string }
type CalDay   = { label: string; date: string; timed: CalEvent[]; allDay: CalEvent[] }
type CalTask  = { id: string; listId?: string; title: string; due?: string; url: string }
type CalendarData = { authorized: boolean; days: CalDay[]; tasks: CalTask[] }

const stubs = {
  ...globalStubs,
  NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
}

function makeEvent(overrides: Partial<CalEvent> = {}): CalEvent {
  return { id: 'e1', summary: 'Team standup', url: 'https://cal.google.com/e1', start: '2025-01-15T09:00:00', end: '2025-01-15T09:30:00', ...overrides }
}

function makeDay(overrides: Partial<CalDay> = {}): CalDay {
  return { label: 'Today', date: '2025-01-15', timed: [], allDay: [], ...overrides }
}

function mountPanel(calendar?: CalendarData | null) {
  return mount(CalendarPanel, {
    props: { calendar },
    global: { stubs },
  })
}

describe('CalendarPanel.vue', () => {
  describe('loading state', () => {
    it('renders skeleton when calendar is undefined', () => {
      const wrapper = mountPanel(undefined)
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    })

    it('renders skeleton when calendar is null', () => {
      const wrapper = mountPanel(null)
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    })

    it('applies cardStyle to skeleton rows', () => {
      const wrapper = mountPanel(null)
      const skeletonRows = wrapper.findAll('.animate-pulse .rounded-lg')
      expect(skeletonRows.length).toBeGreaterThan(0)
      expect(skeletonRows[0].attributes('style')).toContain('var(--color-elevated)')
    })
  })

  describe('unauthorized state', () => {
    it('shows setup link when not authorized', () => {
      const wrapper = mountPanel({ authorized: false, days: [], tasks: [] })
      expect(wrapper.text()).toContain('Set up Google Calendar')
    })

    it('setup link points to /admin/widgets/calendar', () => {
      const wrapper = mountPanel({ authorized: false, days: [], tasks: [] })
      expect(wrapper.find('a').attributes('href')).toBe('/admin/widgets/calendar')
    })
  })

  describe('authorized with no events', () => {
    it('shows No events when all days are empty', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay()],
        tasks: [],
      })
      expect(wrapper.text()).toContain('No events')
    })

    it('does not show No events when days list is empty', () => {
      const wrapper = mountPanel({ authorized: true, days: [], tasks: [] })
      expect(wrapper.text()).not.toContain('No events')
    })
  })

  describe('section container', () => {
    it('does not show skeleton when calendar is loaded', () => {
      const wrapper = mountPanel({ authorized: true, days: [], tasks: [] })
      expect(wrapper.find('.animate-pulse').exists()).toBe(false)
    })
  })

  describe('day labels', () => {
    it('renders the day label for days with events', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ label: 'Today', timed: [makeEvent()] })],
        tasks: [],
      })
      expect(wrapper.text()).toContain('Today')
    })

    it('day labels use text-secondary class (not text-muted)', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ label: 'Today', timed: [makeEvent()] })],
        tasks: [],
      })
      const label = wrapper.findAll('p').find(p => p.text() === 'Today')!
      expect(label.classes()).toContain('text-secondary')
      expect(label.classes()).not.toContain('text-muted')
    })

    it('does not render day label for days with no events', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ label: 'Empty Day', timed: [], allDay: [] })],
        tasks: [],
      })
      expect(wrapper.text()).not.toContain('Empty Day')
    })

    it('first visible day label has no mt-3 class', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ label: 'Today', timed: [makeEvent()] })],
        tasks: [],
      })
      const label = wrapper.findAll('p').find(p => p.text() === 'Today')!
      expect(label.classes()).not.toContain('mt-3')
    })

    it('first visible day has no mt-3 even when preceding days have no events', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [
          makeDay({ label: 'Today', timed: [], allDay: [] }),
          makeDay({ label: 'Tomorrow', date: '2025-01-16', timed: [makeEvent({ id: 'e2', url: 'https://cal.google.com/e2' })] }),
        ],
        tasks: [],
      })
      const label = wrapper.findAll('p').find(p => p.text() === 'Tomorrow')!
      expect(label.classes()).not.toContain('mt-3')
    })

    it('second visible day label has mt-3 for separation', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [
          makeDay({ label: 'Today', timed: [makeEvent()] }),
          makeDay({ label: 'Tomorrow', date: '2025-01-16', timed: [makeEvent({ id: 'e2', url: 'https://cal.google.com/e2' })] }),
        ],
        tasks: [],
      })
      const label = wrapper.findAll('p').find(p => p.text() === 'Tomorrow')!
      expect(label.classes()).toContain('mt-3')
    })
  })

  describe('timed events', () => {
    it('renders event summary', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ timed: [makeEvent({ summary: 'Team standup' })] })],
        tasks: [],
      })
      expect(wrapper.text()).toContain('Team standup')
    })

    it('renders formatted time for timed events', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ timed: [makeEvent({ start: '2025-01-15T09:00:00', end: '2025-01-15T09:30:00' })] })],
        tasks: [],
      })
      expect(wrapper.text()).toContain('09:00')
      expect(wrapper.text()).toContain('09:30')
    })

    it('applies cardStyle to timed event rows', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ timed: [makeEvent()] })],
        tasks: [],
      })
      const eventRow = wrapper.find('a[href="https://cal.google.com/e1"]')
      expect(eventRow.attributes('style')).toContain('var(--color-elevated)')
    })

    it('today events use full border opacity (border-border)', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ timed: [makeEvent()] })],
        tasks: [],
      })
      const eventRow = wrapper.find('a[href]')
      expect(eventRow.classes()).toContain('border-border')
    })

    it('future day events use dimmed border (border-border/60)', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [
          makeDay({ label: 'Today', timed: [makeEvent({ id: 'e1', url: 'https://cal.google.com/e1' })] }),
          makeDay({ label: 'Tomorrow', date: '2025-01-16', timed: [makeEvent({ id: 'e2', url: 'https://cal.google.com/e2' })] }),
        ],
        tasks: [],
      })
      const eventRow = wrapper.find('a[href="https://cal.google.com/e2"]')
      expect(eventRow.classes()).toContain('border-border/60')
    })
  })

  describe('event colors', () => {
    it('uses event color as accent bar background when color is set', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ timed: [makeEvent({ color: '#E67C73' })] })],
        tasks: [],
      })
      const bar = wrapper.find('.rounded-full')
      expect(bar.attributes('style')).toContain('#E67C73')
    })

    it('uses event color on all-day event accent bar', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ allDay: [makeEvent({ id: 'ad1', url: 'https://cal.google.com/ad1', color: '#33B679' })] })],
        tasks: [],
      })
      const bar = wrapper.find('.rounded-full')
      expect(bar.attributes('style')).toContain('#33B679')
    })

    it('falls back gracefully when no color is set', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ timed: [makeEvent({ color: undefined })] })],
        tasks: [],
      })
      const bar = wrapper.find('.rounded-full')
      expect(bar.attributes('style')).toBeTruthy()
    })
  })

  describe('all-day events', () => {
    it('renders all-day event summary', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ allDay: [makeEvent({ id: 'ad1', summary: 'Company holiday', url: 'https://cal.google.com/ad1' })] })],
        tasks: [],
      })
      expect(wrapper.text()).toContain('Company holiday')
    })

    it('shows All day label for all-day events', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ allDay: [makeEvent({ id: 'ad1', url: 'https://cal.google.com/ad1' })] })],
        tasks: [],
      })
      expect(wrapper.text()).toContain('All day')
    })

    it('applies cardStyle to all-day event rows', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [makeDay({ allDay: [makeEvent({ id: 'ad1', url: 'https://cal.google.com/ad1' })] })],
        tasks: [],
      })
      const row = wrapper.find('a[href="https://cal.google.com/ad1"]')
      expect(row.attributes('style')).toContain('var(--color-elevated)')
    })
  })

  describe('scroll container', () => {
    it('root element has cal-scroll class for left-side scrollbar', () => {
      const wrapper = mountPanel(null)
      expect(wrapper.element.classList.contains('cal-scroll')).toBe(true)
    })

    it('root element has max-h-[250px] class', () => {
      const wrapper = mountPanel(null)
      expect(wrapper.element.classList.contains('max-h-[250px]')).toBe(true)
    })

    it('root element has overflow-y-auto class', () => {
      const wrapper = mountPanel(null)
      expect(wrapper.element.classList.contains('overflow-y-auto')).toBe(true)
    })

    it('loading skeleton inner div has ltr class', () => {
      const wrapper = mountPanel(null)
      expect(wrapper.find('.animate-pulse').classes()).toContain('ltr')
    })

    it('loaded content inner div has ltr class', () => {
      const wrapper = mountPanel({ authorized: true, days: [], tasks: [] })
      const inner = wrapper.find('.ltr')
      expect(inner.exists()).toBe(true)
    })
  })

  describe('tasks', () => {
    it('renders task title', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [],
        tasks: [{ id: 't1', title: 'Write report', url: 'https://tasks.google.com/t1' }],
      })
      expect(wrapper.text()).toContain('Write report')
    })

    it('shows Tasks section label', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [],
        tasks: [{ id: 't1', title: 'Do something', url: '' }],
      })
      const label = wrapper.findAll('p').find(p => p.text() === 'Tasks')
      expect(label).toBeTruthy()
    })

    it('tasks section label uses text-secondary', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [],
        tasks: [{ id: 't1', title: 'Do something', url: '' }],
      })
      const label = wrapper.findAll('p').find(p => p.text() === 'Tasks')!
      expect(label.classes()).toContain('text-secondary')
    })

    it('provides an open link to the task url', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [],
        tasks: [{ id: 't1', title: 'Do something', url: 'https://tasks.google.com/t1' }],
      })
      const link = wrapper.find('a[href="https://tasks.google.com/t1"]')
      expect(link.exists()).toBe(true)
      expect(link.attributes('target')).toBe('_blank')
    })

    it('shows the due date in a pill', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [],
        tasks: [{ id: 't1', title: 'Task', due: '2025-03-15T00:00:00', url: '' }],
      })
      const pill = wrapper.findAll('span').find(s => s.text().includes('Mar'))
      expect(pill?.classes()).toContain('rounded-full')
    })

    it('uses a warning pill for an overdue task', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [],
        tasks: [{ id: 't1', title: 'Task', due: '2000-01-02T00:00:00', url: '' }],
      })
      const pill = wrapper.findAll('span').find(s => s.text().includes('Jan'))
      expect(pill?.classes()).toContain('text-warning')
    })

    it('uses an emerald pill for a future task', () => {
      const future = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
      const wrapper = mountPanel({
        authorized: true,
        days: [],
        tasks: [{ id: 't1', title: 'Task', due: `${future}T00:00:00`, url: '' }],
      })
      const pill = wrapper.findAll('span').find(s => s.classes().includes('px-2'))
      expect(pill?.classes()).toContain('text-emerald-300')
      expect(pill?.classes()).not.toContain('text-warning')
    })

    it('shows No date when due is absent', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [],
        tasks: [{ id: 't1', title: 'Task', url: '' }],
      })
      expect(wrapper.text()).toContain('No date')
    })

    it('renders a complete trigger row per task', () => {
      const wrapper = mountPanel({
        authorized: true,
        days: [],
        tasks: [{ id: 't1', title: 'Task', url: '' }],
      })
      expect(wrapper.find('[role="button"][aria-label="Complete Task"]').exists()).toBe(true)
    })

    it('emits complete with the task when the row is clicked', async () => {
      const task = { id: 't1', listId: 'l1', title: 'Task', url: '' }
      const wrapper = mountPanel({ authorized: true, days: [], tasks: [task] })
      await wrapper.find('[role="button"][aria-label="Complete Task"]').trigger('click')
      expect(wrapper.emitted('complete')?.[0]?.[0]).toMatchObject({ id: 't1', listId: 'l1' })
    })

    it('does not emit complete when the open link is clicked', async () => {
      const task = { id: 't1', listId: 'l1', title: 'Task', url: 'https://tasks.google.com/t1' }
      const wrapper = mountPanel({ authorized: true, days: [], tasks: [task] })
      await wrapper.find('a[href="https://tasks.google.com/t1"]').trigger('click')
      expect(wrapper.emitted('complete')).toBeFalsy()
    })

    it('does not render Tasks label when tasks list is empty', () => {
      const wrapper = mountPanel({ authorized: true, days: [], tasks: [] })
      expect(wrapper.text()).not.toContain('Tasks')
    })
  })
})
