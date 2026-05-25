// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { globalStubs } from './helpers'

vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({}))
vi.stubGlobal('widgetDefinitions', {
  sonarr: { name: 'Sonarr', authType: 'apiKey', fields: [{ label: 'Wanted', desc: '' }] },
  pihole: { name: 'Pi-hole', authType: 'basic', fields: [] },
  duplicati: { name: 'Duplicati', authType: 'password', fields: [] },
  tdarr: { name: 'Tdarr', authType: 'none', fields: [] },
})
vi.stubGlobal('envVarName', (type: string, field: string) => `${type.toUpperCase()}_${field.toUpperCase()}`)
vi.stubGlobal('parseEnvRef', () => null)

import ServiceModal from '~/components/edit/ServiceModal.vue'
import IconField from '~/components/edit/modal/IconField.vue'
import DockerField from '~/components/edit/modal/DockerField.vue'
import WidgetTypeField from '~/components/edit/modal/WidgetTypeField.vue'
import CredentialFields from '~/components/edit/modal/CredentialFields.vue'
import WidgetTestResult from '~/components/edit/modal/WidgetTestResult.vue'

type Service = {
  name: string
  url?: string
  icon?: string
  description?: string
  type?: string
  apiKey?: string
  username?: string
  password?: string
  container?: string
  server?: string
}

const stubs = {
  ...globalStubs,
  // Use real (visible) IconPicker stub for browse tests
  IconPicker: true,
}

function mountModal(service: Service | null = null, group = 'Media') {
  return mount(ServiceModal, {
    props: { service, group },
    global: {
      stubs,
      components: { IconField, DockerField, WidgetTypeField, CredentialFields, WidgetTestResult },
    },
  })
}

describe('ServiceModal.vue', () => {
  beforeEach(() => {
    vi.mocked(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue({})
  })

  it('shows "Add service" when service=null', () => {
    const wrapper = mountModal(null)
    expect(wrapper.find('h2').text()).toBe('Add service')
  })

  it('shows "Edit service" when editing an existing service', async () => {
    const wrapper = mountModal({ name: 'Sonarr' })
    await flushPromises()
    expect(wrapper.find('h2').text()).toBe('Edit service')
  })

  it('pre-fills name, url, description from service prop', async () => {
    const wrapper = mountModal({ name: 'Sonarr', url: 'http://sonarr', description: 'TV shows' })
    await flushPromises()
    const inputs = wrapper.findAll('input')
    const nameInput = inputs.find(i => (i.element as HTMLInputElement).placeholder === 'Sonarr')
    const urlInput = inputs.find(i => (i.element as HTMLInputElement).placeholder === 'http://192.168.1.10:8989')
    expect(nameInput!.element.value).toBe('Sonarr')
    expect(urlInput!.element.value).toBe('http://sonarr')
  })

  it('X button (close) emits close', async () => {
    const wrapper = mountModal(null)
    const header = wrapper.find('.px-6.py-4.border-b')
    await header.find('button').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('Cancel button emits close', async () => {
    const wrapper = mountModal(null)
    const buttons = wrapper.findAll('button')
    const cancelBtn = buttons.find(b => b.text() === 'Cancel')
    await cancelBtn!.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('Save with empty name shows "Name is required" error', async () => {
    const wrapper = mountModal(null)
    const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
    await saveBtn!.trigger('click')
    expect(wrapper.text()).toContain('Name is required')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('Save with valid name emits save event with form data', async () => {
    const wrapper = mountModal(null)
    const nameInput = wrapper.findAll('input').find(i => (i.element as HTMLInputElement).placeholder === 'Sonarr')
    await nameInput!.setValue('Sonarr')
    const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
    await saveBtn!.trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
    const [payload] = wrapper.emitted('save')![0] as [Service]
    expect(payload.name).toBe('Sonarr')
  })

  it('Save button is disabled while credsLoading is true (when editing existing service)', () => {
    // When service has a name, $fetch is called and credsLoading=true until resolved
    const wrapper = mountModal({ name: 'Sonarr' })
    const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
    expect(saveBtn!.attributes('disabled')).toBeDefined()
  })

  it('Save button is enabled after creds load', async () => {
    const wrapper = mountModal({ name: 'Sonarr' })
    await flushPromises()
    const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
    expect(saveBtn!.attributes('disabled')).toBeUndefined()
  })

  it('Widget type dropdown: clicking input shows dropdown with widget entries', async () => {
    const wrapper = mountModal(null)
    const widgetInput = wrapper.findAll('input').find(i => (i.element as HTMLInputElement).placeholder === '-')
    await widgetInput!.trigger('focus')
    // Dropdown should be visible
    const buttons = wrapper.findAll('button')
    const sonarrBtn = buttons.find(b => b.find('span.font-mono') && b.text().includes('sonarr'))
    expect(sonarrBtn).toBeTruthy()
  })

  it('Widget type dropdown: selecting "sonarr" sets form type and hides dropdown', async () => {
    const wrapper = mountModal(null)
    const widgetInput = wrapper.findAll('input').find(i => (i.element as HTMLInputElement).placeholder === '-')
    await widgetInput!.trigger('focus')
    // Dropdown is now open — find the sonarr option
    const dropdownBtns = wrapper.findAll('button').filter(b => {
      const monoPart = b.find('span.font-mono')
      return monoPart.exists() && monoPart.text() === 'sonarr'
    })
    expect(dropdownBtns.length).toBeGreaterThan(0)
    // Click the sonarr option directly (mousedown.prevent calls selectWidget)
    await dropdownBtns[0].trigger('mousedown')
    await flushPromises()
    // After selecting sonarr, the dropdown closes and the auth badge shows 'apiKey'
    expect(wrapper.text()).toContain('apiKey')
  })

  it('no credential fields when type is empty', () => {
    const wrapper = mountModal(null)
    // No API key, username, password inputs when no type set
    const inputs = wrapper.findAll('input')
    const fieldPlaceholders = inputs.map(i => (i.element as HTMLInputElement).placeholder)
    expect(fieldPlaceholders.some(p => p === 'Loading...')).toBe(false)
  })

  it('API key field shown when type is sonarr (authType: apiKey)', async () => {
    const wrapper = mountModal({ name: 'Sonarr', type: 'sonarr' })
    await flushPromises()
    // SecretInput stub renders a .use-env-var button for the api key field
    expect(wrapper.find('.use-env-var').exists()).toBe(true)
  })

  it('Username and Password fields shown when type is pihole (authType: basic)', async () => {
    const wrapper = mountModal({ name: 'Pihole', type: 'pihole' })
    await flushPromises()
    // Username: plain input with env var hint; Password: SecretInput stub with .use-env-var button
    expect(wrapper.find('.use-env-var').exists()).toBe(true)
    // Username text input exists (not from SecretInput)
    const inputs = wrapper.findAll('input[type="text"], input:not([type])')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('no credential fields when type is tdarr (authType: none)', async () => {
    const wrapper = mountModal({ name: 'Tdarr', type: 'tdarr' })
    await flushPromises()
    // authType none - no SecretInput rendered
    expect(wrapper.find('.use-env-var').exists()).toBe(false)
  })

  it('only Password field shown when type is duplicati (authType: password)', async () => {
    const wrapper = mountModal({ name: 'Duplicati', type: 'duplicati' })
    await flushPromises()
    // Only one SecretInput (password), no username field
    expect(wrapper.findAll('.use-env-var').length).toBe(1)
    expect(wrapper.text()).not.toContain('Username')
  })

  it('"Test widget" button shown only when both type and url are set', async () => {
    const wrapper = mountModal({ name: 'Sonarr', type: 'sonarr', url: 'http://sonarr' })
    await flushPromises()
    const testBtn = wrapper.findAll('button').find(b => b.text().includes('Test widget'))
    expect(testBtn).toBeTruthy()
  })

  it('"Test widget" button NOT shown when only type is set (no url)', async () => {
    const wrapper = mountModal({ name: 'Sonarr', type: 'sonarr' })
    await flushPromises()
    const testBtn = wrapper.findAll('button').find(b => b.text().includes('Test widget'))
    expect(testBtn).toBeFalsy()
  })

  it('Escape key emits close', async () => {
    const { useEventListener } = await import('@vueuse/core')
    const mockFn = useEventListener as ReturnType<typeof vi.fn>
    mockFn.mockClear()
    const wrapper = mountModal(null)
    const keydownCall = mockFn.mock.calls.find(([event]: [string]) => event === 'keydown')
    expect(keydownCall).toBeTruthy()
    const handler = keydownCall[1] as (e: KeyboardEvent) => void
    handler(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('Docker section: Server and Container fields rendered', () => {
    const wrapper = mountModal(null)
    const labels = wrapper.findAll('label')
    expect(labels.some(l => l.text() === 'Server')).toBe(true)
    expect(labels.some(l => l.text() === 'Container')).toBe(true)
    const containerInput = wrapper.findAll('input').find(i => (i.element as HTMLInputElement).placeholder === 'auto')
    expect(containerInput).toBeTruthy()
  })
})
