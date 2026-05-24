// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'
import WidgetCard from '~/components/admin/WidgetCard.vue'

const AUTH_COLORS = {
  header: '#6366f1',
  bearer: '#22c55e',
  basic: '#f59e0b',
  query: '#a78bfa',
  password: '#f472b6',
  none: '#9ca3af',
}

const ENTRY = {
  name: 'Sonarr',
  authType: 'header',
  fields: [
    { label: 'Series' },
    { label: 'Monitored' },
    { label: 'Queued' },
    { label: 'Wanted' },
    { label: 'Cutoff unmet' },
  ],
}

function mountCard(activeLabels: string[]) {
  return mount(WidgetCard, {
    props: { type: 'sonarr', entry: ENTRY, activeLabels, isDirty: false, saving: false, authColors: AUTH_COLORS },
    global: { stubs: globalStubs },
  })
}

describe('WidgetCard.vue', () => {
  describe('layout', () => {
    it('renders the widget name', () => {
      expect(mountCard(['Series']).text()).toContain('Sonarr')
    })

    it('renders active fields in the active section', () => {
      const w = mountCard(['Series', 'Queued'])
      expect(w.text()).toContain('Series')
      expect(w.text()).toContain('Queued')
    })

    it('renders inactive fields in the available section', () => {
      const w = mountCard(['Series'])
      expect(w.text()).toContain('+ Monitored')
      expect(w.text()).toContain('+ Queued')
    })

    it('does not show available section when all fields are active', () => {
      const labels = ENTRY.fields.map(f => f.label)
      const w = mountCard(labels)
      expect(w.text()).not.toContain('Available')
    })

    it('shows field count in footer', () => {
      const w = mountCard(['Series', 'Queued'])
      expect(w.text()).toContain('2 / 5 fields shown')
    })

    it('shows Save and Cancel buttons when isDirty is true', () => {
      const w = mount(WidgetCard, {
        props: { type: 'sonarr', entry: ENTRY, activeLabels: ['Series'], isDirty: true, saving: false, authColors: AUTH_COLORS },
        global: { stubs: globalStubs },
      })
      expect(w.findAll('button').some(b => b.text() === 'Save')).toBe(true)
      expect(w.findAll('button').some(b => b.text() === 'Cancel')).toBe(true)
    })

    it('hides Save and Cancel buttons when not dirty', () => {
      const w = mountCard(['Series'])
      expect(w.findAll('button').some(b => b.text() === 'Save')).toBe(false)
      expect(w.findAll('button').some(b => b.text() === 'Cancel')).toBe(false)
    })
  })

  describe('activate field', () => {
    it('emits update-fields with field added when clicking an available field', async () => {
      const w = mountCard(['Series'])
      await w.findAll('button').find(b => b.text() === '+ Monitored')!.trigger('click')
      expect(w.emitted('updateFields')).toBeTruthy()
      expect((w.emitted('updateFields')![0] as string[][])[0]).toEqual(['Series', 'Monitored'])
    })

    it('appends newly activated field at the end', async () => {
      const w = mountCard(['Series', 'Queued'])
      await w.findAll('button').find(b => b.text() === '+ Wanted')!.trigger('click')
      const emitted = (w.emitted('updateFields')![0] as string[][])[0]
      expect(emitted).toEqual(['Series', 'Queued', 'Wanted'])
    })

    it('removes from available section after activation', async () => {
      const w = mountCard(['Series'])
      await w.findAll('button').find(b => b.text() === '+ Monitored')!.trigger('click')
      expect(w.text()).not.toContain('+ Monitored')
    })
  })

  describe('deactivate field', () => {
    it('emits update-fields with field removed when clicking xmark on active field', async () => {
      const w = mountCard(['Series', 'Queued'])
      // xmark buttons are the remove buttons on active fields
      const xButtons = w.findAll('[title="Remove Series"]')
      await xButtons[0]!.trigger('click')
      const emitted = (w.emitted('updateFields')![0] as string[][])[0]
      expect(emitted).toEqual(['Queued'])
    })

    it('moves deactivated field to available section', async () => {
      const w = mountCard(['Series', 'Queued'])
      await w.find('[title="Remove Series"]').trigger('click')
      expect(w.text()).toContain('+ Series')
    })
  })

  describe('prop sync', () => {
    it('syncs dragList when activeLabels prop changes externally', async () => {
      const w = mountCard(['Series', 'Queued'])
      await w.setProps({ activeLabels: ['Monitored'] })
      // Monitored should be active (no + prefix), Series should only appear as available
      expect(w.text()).toContain('Monitored')
      expect(w.text()).toContain('+ Series')
    })

    it('does not reset dragList when prop reflects a user change (same content)', async () => {
      const w = mountCard(['Series'])
      await w.findAll('button').find(b => b.text() === '+ Monitored')!.trigger('click')
      // Simulate parent bouncing the same new value back
      await w.setProps({ activeLabels: ['Series', 'Monitored'] })
      // Should still show both as active
      expect(w.text()).not.toContain('+ Monitored')
    })
  })

  describe('save', () => {
    it('emits save when Save button clicked', async () => {
      const w = mount(WidgetCard, {
        props: { type: 'sonarr', entry: ENTRY, activeLabels: ['Series'], isDirty: true, saving: false, authColors: AUTH_COLORS },
        global: { stubs: globalStubs },
      })
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      expect(w.emitted('save')).toBeTruthy()
    })

    it('shows Saving... and disables buttons when saving', () => {
      const w = mount(WidgetCard, {
        props: { type: 'sonarr', entry: ENTRY, activeLabels: ['Series'], isDirty: true, saving: true, authColors: AUTH_COLORS },
        global: { stubs: globalStubs },
      })
      const saveBtn = w.findAll('button').find(b => b.text() === 'Saving...')!
      const cancelBtn = w.findAll('button').find(b => b.text() === 'Cancel')!
      expect(saveBtn.attributes('disabled')).toBeDefined()
      expect(cancelBtn.attributes('disabled')).toBeDefined()
    })
  })

  describe('cancel', () => {
    it('emits cancel event when Cancel clicked', async () => {
      const w = mount(WidgetCard, {
        props: { type: 'sonarr', entry: ENTRY, activeLabels: ['Series'], isDirty: true, saving: false, authColors: AUTH_COLORS },
        global: { stubs: globalStubs },
      })
      await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
      expect(w.emitted('cancel')).toBeTruthy()
    })

    it('restores the active field list when parent resets activeLabels after cancel', async () => {
      const w = mountCard(['Series'])
      await w.findAll('button').find(b => b.text() === '+ Monitored')!.trigger('click')
      // Simulate parent resetting activeLabels back to saved state after receiving cancel
      await w.setProps({ activeLabels: ['Series'], isDirty: false })
      expect(w.text()).toContain('+ Monitored')
      expect(w.text()).not.toContain('+ Series')
    })
  })
})
