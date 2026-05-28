// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('navigateTo', vi.fn())

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)

vi.mock('fflate', () => ({
  unzipSync: vi.fn(() => ({
    'services.yaml': new Uint8Array([115, 118, 99]),
    'bookmarks.yaml': new Uint8Array([98, 107, 109]),
  })),
  strFromU8: vi.fn((data: Uint8Array) => {
    if (data[0] === 115)
      return '- name: Media\n  services: []\n'
    return '- name: Dev\n  bookmarks: []\n'
  }),
}))

function makeUseFetch(files: { name: string; modified: string; size: number }[] = []) {
  return vi.fn(() => ({
    data: { value: { files } },
    refresh: vi.fn(),
  }))
}
vi.stubGlobal('useFetch', makeUseFetch())

import AdminBackup from '~/pages/admin/backup.vue'

const stubs = {
  ...globalStubs,
  FaIcon: { template: '<span class="fa-icon" :data-icon="icon" />', props: ['icon', 'spin'] },
  YamlFilePreview: {
    template: `<div class="yaml-preview" :data-filename="filename">
      <slot />
      <button @click="$emit('load')">Preview</button>
      <div v-if="error" class="preview-error">{{ error }}</div>
      <div v-else-if="content" class="preview-content">{{ content }}</div>
      <slot name="actions" />
    </div>`,
    props: ['filename', 'content', 'loading', 'error'],
    emits: ['load'],
  },
}

function mountPage(autoBackupFiles: { name: string; modified: string; size: number }[] = []) {
  vi.stubGlobal('useFetch', makeUseFetch(autoBackupFiles))
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

  it('does not show Restore button until a file is selected and parsed', () => {
    const w = mountPage()
    expect(w.findAll('button').some(b => /Restore \d+ file/.test(b.text()))).toBe(false)
  })

  it('shows file previews after selecting a zip file', async () => {
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await new Promise(r => setTimeout(r, 10))
    expect(w.findAll('.yaml-preview').length).toBeGreaterThan(0)
  })

  it('shows Restore button after parsing zip files', async () => {
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await new Promise(r => setTimeout(r, 10))
    expect(w.findAll('button').some(b => /Restore \d+ file/.test(b.text()))).toBe(true)
  })

  it('shows checkboxes for each file in the zip', async () => {
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await new Promise(r => setTimeout(r, 10))
    const checkboxes = w.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBe(2)
  })

  it('all files are selected by default', async () => {
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await new Promise(r => setTimeout(r, 10))
    const checkboxes = w.findAll('input[type="checkbox"]')
    expect(checkboxes.every(cb => (cb.element as HTMLInputElement).checked)).toBe(true)
  })

  it('Restore button is disabled when no files are selected', async () => {
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await new Promise(r => setTimeout(r, 10))
    for (const cb of w.findAll('input[type="checkbox"]'))
      await cb.trigger('change')
    const restoreBtn = w.findAll('button').find(b => /Restore \d+ file/.test(b.text()))!
    expect(restoreBtn.element.disabled).toBe(true)
  })

  it('shows parsed filenames in previews', async () => {
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await new Promise(r => setTimeout(r, 10))
    const previews = w.findAll('.yaml-preview')
    const names = previews.map(p => p.attributes('data-filename'))
    expect(names).toContain('services.yaml')
    expect(names).toContain('bookmarks.yaml')
  })

  it('clicking Restore now calls $fetch with POST to /api/admin/restore', async () => {
    fetchMock.mockResolvedValue({ ok: true, restored: ['services.yaml'] })
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await new Promise(r => setTimeout(r, 10))
    const restoreBtn = w.findAll('button').find(b => /Restore \d+ file/.test(b.text()))!
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
    await new Promise(r => setTimeout(r, 10))
    await w.findAll('button').find(b => /Restore \d+ file/.test(b.text()))!.trigger('click')
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
    await new Promise(r => setTimeout(r, 10))
    await w.findAll('button').find(b => /Restore \d+ file/.test(b.text()))!.trigger('click')
    await new Promise(r => setTimeout(r, 20))
    expect(w.text()).toContain('Invalid zip')
  })

  it('Cancel clears selected file and hides Restore now button', async () => {
    const w = mountPage()
    const input = w.find('input[type="file"]')
    const file = new File(['PK'], 'backup.zip', { type: 'application/zip' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await new Promise(r => setTimeout(r, 10))
    expect(w.findAll('button').some(b => /Restore \d+ file/.test(b.text()))).toBe(true)
    await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
    expect(w.findAll('button').some(b => /Restore \d+ file/.test(b.text()))).toBe(false)
  })

  describe('auto-backup section', () => {
    const sampleFiles = [
      { name: 'services.yaml', modified: '2026-05-28T10:00:00Z', size: 512 },
      { name: 'bookmarks.yaml', modified: '2026-05-27T08:30:00Z', size: 256 },
    ]

    it('shows Auto-backups section heading', () => {
      const w = mountPage()
      expect(w.text()).toContain('Auto-backups')
    })

    it('shows No auto-backups message when list is empty', () => {
      const w = mountPage([])
      expect(w.text()).toContain('No auto-backups found')
    })

    it('renders a row for each auto-backup file', () => {
      const w = mountPage(sampleFiles)
      const previews = w.findAll('.yaml-preview')
      const names = previews.map(p => p.attributes('data-filename'))
      expect(names).toContain('services.yaml')
      expect(names).toContain('bookmarks.yaml')
    })

    it('shows a Restore button for each auto-backup file', () => {
      const w = mountPage(sampleFiles)
      const restoreBtns = w.findAll('button').filter(b => b.text() === 'Restore')
      expect(restoreBtns.length).toBe(sampleFiles.length)
    })

    it('clicking Restore calls POST /api/admin/auto-backup-restore with filename', async () => {
      fetchMock.mockResolvedValue({ ok: true, restored: 'services.yaml' })
      const w = mountPage(sampleFiles)
      const restoreBtn = w.findAll('button').find(b => b.text() === 'Restore')!
      await restoreBtn.trigger('click')
      await new Promise(r => setTimeout(r, 20))
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/auto-backup-restore',
        expect.objectContaining({ method: 'POST', body: expect.objectContaining({ filename: 'services.yaml' }) }),
      )
    })

    it('shows Restored label after successful restore', async () => {
      fetchMock.mockResolvedValue({ ok: true, restored: 'services.yaml' })
      const w = mountPage(sampleFiles)
      const restoreBtn = w.findAll('button').find(b => b.text() === 'Restore')!
      await restoreBtn.trigger('click')
      await new Promise(r => setTimeout(r, 20))
      expect(w.text()).toContain('Restored')
    })

    it('shows error message when auto-restore fails', async () => {
      fetchMock.mockRejectedValue({ data: { statusMessage: 'No backup found' } })
      const w = mountPage(sampleFiles)
      const restoreBtn = w.findAll('button').find(b => b.text() === 'Restore')!
      await restoreBtn.trigger('click')
      await new Promise(r => setTimeout(r, 20))
      expect(w.text()).toContain('No backup found')
    })

    describe('preview', () => {
      it('shows a Preview button for each auto-backup file', () => {
        const w = mountPage(sampleFiles)
        const previewBtns = w.findAll('button').filter(b => b.text() === 'Preview')
        expect(previewBtns.length).toBe(sampleFiles.length)
      })

      it('clicking Preview fetches the backup content', async () => {
        fetchMock.mockResolvedValue({ content: '- name: Media\n' })
        const w = mountPage(sampleFiles)
        const previewBtn = w.findAll('button').find(b => b.text() === 'Preview')!
        await previewBtn.trigger('click')
        await new Promise(r => setTimeout(r, 20))
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/auto-backup-preview'),
        )
      })

      it('shows the file content after loading', async () => {
        fetchMock.mockResolvedValue({ content: '- name: Media\n  services: []\n' })
        const w = mountPage(sampleFiles)
        const previewBtn = w.findAll('button').find(b => b.text() === 'Preview')!
        await previewBtn.trigger('click')
        await new Promise(r => setTimeout(r, 20))
        const preview = w.find('.yaml-preview[data-filename="services.yaml"]')
        expect(preview.find('.preview-content').text()).toContain('Media')
      })

      it('shows error when preview fetch fails', async () => {
        fetchMock.mockRejectedValue({ data: { statusMessage: 'Not found' } })
        const w = mountPage(sampleFiles)
        const previewBtn = w.findAll('button').find(b => b.text() === 'Preview')!
        await previewBtn.trigger('click')
        await new Promise(r => setTimeout(r, 20))
        expect(w.find('.preview-error').text()).toContain('Not found')
      })
    })
  })
})
