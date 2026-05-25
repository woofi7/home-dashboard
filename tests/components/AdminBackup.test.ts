// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useFetch', () => ({ data: { value: null }, refresh: vi.fn() }))

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)

import AdminBackup from '~/pages/admin/backup.vue'

const stubs = {
  ...globalStubs,
  FaIcon: { template: '<span class="fa-icon" :data-icon="icon" />', props: ['icon', 'spin'] },
}

function mountPage() {
  return mount(AdminBackup, { global: { stubs } })
}

describe('admin/backup.vue', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(new Blob(['PK'], { type: 'application/zip' }))
  })

  it('shows a Backup section heading', () => {
    expect(mountPage().text()).toContain('Backup')
  })

  it('shows a Restore section heading', () => {
    expect(mountPage().text()).toContain('Restore')
  })

  it('has a Download backup button', () => {
    const w = mountPage()
    expect(w.findAll('button').some(b => b.text().includes('Download backup'))).toBe(true)
  })

  it('has a file input accepting .zip', () => {
    const input = mountPage().find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('accept')).toContain('.zip')
  })

  it('clicking Download backup calls $fetch with the backup endpoint', async () => {
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn().mockReturnValue('blob:x')
    URL.revokeObjectURL = vi.fn()

    const w = mountPage()
    const btn = w.findAll('button').find(b => b.text().includes('Download backup'))!
    await btn.trigger('click')
    await new Promise(r => setTimeout(r, 10))
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/backup', { responseType: 'blob' })

    URL.createObjectURL = origCreate
    URL.revokeObjectURL = origRevoke
  })

  it('does not show Restore now button until a file is selected', () => {
    const w = mountPage()
    expect(w.findAll('button').some(b => b.text().includes('Restore now'))).toBe(false)
  })

  it('shows Restore now button after selecting a file', async () => {
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    expect(w.findAll('button').some(b => b.text().includes('Restore now'))).toBe(true)
  })

  it('clicking Restore now calls $fetch with POST to /api/admin/restore', async () => {
    fetchMock.mockResolvedValue({ ok: true, restored: ['services.yaml'] })
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    const restoreBtn = w.findAll('button').find(b => b.text().includes('Restore now'))!
    await restoreBtn.trigger('click')
    await new Promise(r => setTimeout(r, 10))
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/restore', expect.objectContaining({ method: 'POST' }))
  })

  it('shows restored file list on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, restored: ['services.yaml', 'bookmarks.yaml'] })
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await w.findAll('button').find(b => b.text().includes('Restore now'))!.trigger('click')
    await new Promise(r => setTimeout(r, 20))
    expect(w.text()).toContain('services.yaml')
    expect(w.text()).toContain('bookmarks.yaml')
  })

  it('shows error message on restore failure', async () => {
    fetchMock.mockRejectedValue({ data: { statusMessage: 'Invalid zip' } })
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await w.findAll('button').find(b => b.text().includes('Restore now'))!.trigger('click')
    await new Promise(r => setTimeout(r, 20))
    expect(w.text()).toContain('Invalid zip')
  })

  it('Cancel clears selected file and hides Restore now button', async () => {
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    expect(w.findAll('button').some(b => b.text().includes('Restore now'))).toBe(true)
    await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
    expect(w.findAll('button').some(b => b.text().includes('Restore now'))).toBe(false)
  })
})
