// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'
import AdminSaveBar from '~/components/admin/AdminSaveBar.vue'

function mountBar(props: { isDirty: boolean; saving: boolean; saveError?: string; saveSuccess?: boolean }) {
  return mount(AdminSaveBar, {
    props,
    global: { stubs: { Teleport: globalStubs.Teleport } },
  })
}

describe('AdminSaveBar.vue', () => {
  it('shows Unsaved changes when dirty and no error/success', () => {
    const w = mountBar({ isDirty: true, saving: false })
    expect(w.text()).toContain('Unsaved changes')
  })

  it('does not show Unsaved changes when not dirty', () => {
    const w = mountBar({ isDirty: false, saving: false })
    expect(w.text()).not.toContain('Unsaved changes')
  })

  it('shows Saved when saveSuccess is true', () => {
    const w = mountBar({ isDirty: false, saving: false, saveSuccess: true })
    expect(w.text()).toContain('Saved')
  })

  it('shows error message when saveError is set', () => {
    const w = mountBar({ isDirty: true, saving: false, saveError: 'Unauthorized' })
    expect(w.text()).toContain('Unauthorized')
  })

  it('error takes priority over Unsaved changes', () => {
    const w = mountBar({ isDirty: true, saving: false, saveError: 'Failed' })
    expect(w.text()).not.toContain('Unsaved changes')
  })

  it('Save button is disabled when not dirty', () => {
    const w = mountBar({ isDirty: false, saving: false })
    expect(w.findAll('button').find(b => b.text() === 'Save')!.attributes('disabled')).toBeDefined()
  })

  it('Cancel button is disabled when not dirty', () => {
    const w = mountBar({ isDirty: false, saving: false })
    expect(w.findAll('button').find(b => b.text() === 'Cancel')!.attributes('disabled')).toBeDefined()
  })

  it('Save button is enabled when dirty', () => {
    const w = mountBar({ isDirty: true, saving: false })
    expect(w.findAll('button').find(b => b.text() === 'Save')!.attributes('disabled')).toBeUndefined()
  })

  it('Cancel button is enabled when dirty', () => {
    const w = mountBar({ isDirty: true, saving: false })
    expect(w.findAll('button').find(b => b.text() === 'Cancel')!.attributes('disabled')).toBeUndefined()
  })

  it('Save button is disabled when saving', () => {
    const w = mountBar({ isDirty: true, saving: true })
    expect(w.findAll('button').find(b => b.text() === 'Saving...')!.attributes('disabled')).toBeDefined()
  })

  it('Cancel button is disabled when saving', () => {
    const w = mountBar({ isDirty: true, saving: true })
    expect(w.findAll('button').find(b => b.text() === 'Cancel')!.attributes('disabled')).toBeDefined()
  })

  it('shows Saving... text when saving', () => {
    const w = mountBar({ isDirty: true, saving: true })
    expect(w.text()).toContain('Saving...')
  })

  it('emits save when Save is clicked', async () => {
    const w = mountBar({ isDirty: true, saving: false })
    await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
    expect(w.emitted('save')).toBeTruthy()
  })

  it('emits cancel when Cancel is clicked', async () => {
    const w = mountBar({ isDirty: true, saving: false })
    await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
    expect(w.emitted('cancel')).toBeTruthy()
  })
})
