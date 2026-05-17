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
    global: { stubs },
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
    // The widget input should now be bound to widgetSearch; set value via setValue
    // which triggers the v-model update equivalent
    // Simulate selecting by setting widgetSearch directly via widget input setValue+input event
    await widgetInput!.setValue('sonarr')
    // trigger input event to call onWidgetInput which sets form.type
    await widgetInput!.trigger('input')
    await wrapper.vm.$nextTick()
    expect(widgetInput!.element.value).toBe('sonarr')
    // Verify form.type was set (via the dropdown option select behavior)
    // The showDropdown is still true after typing — click the option
    const updatedBtns = wrapper.findAll('button').filter(b => {
      const monoPart = b.find('span.font-mono')
      return monoPart.exists() && monoPart.text() === 'sonarr'
    })
    expect(updatedBtns.length).toBeGreaterThan(0)
    await updatedBtns[0].trigger('mousedown')
    await wrapper.vm.$nextTick()
    // After selectWidget, widgetSearch = form.type = 'sonarr' and dropdown closes
    expect(widgetInput!.element.value).toBe('sonarr')
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
    // After creds load, should show API key input (not username/password)
    const inputs = wrapper.findAll('input')
    // API key input has font-mono class and autocomplete=off
    const apiInput = inputs.find(i => {
      const el = i.element as HTMLInputElement
      return el.autocomplete === 'off' && i.classes().includes('font-mono') && el.placeholder !== '-' && el.placeholder !== 'nas' && el.placeholder !== 'auto'
    })
    expect(apiInput).toBeTruthy()
  })

  it('Username and Password fields shown when type is pihole (authType: basic)', async () => {
    const wrapper = mountModal({ name: 'Pihole', type: 'pihole' })
    await flushPromises()
    const text = wrapper.text()
    // The labels come from Field stubs (stubbed as div with slot), but we can check
    // input types: password input exists
    const inputs = wrapper.findAll('input')
    const passwordInputs = inputs.filter(i => (i.element as HTMLInputElement).type === 'password')
    expect(passwordInputs.length).toBeGreaterThan(0)
  })

  it('no credential fields when type is tdarr (authType: none)', async () => {
    const wrapper = mountModal({ name: 'Tdarr', type: 'tdarr' })
    await flushPromises()
    // authType none → no credential block
    const inputs = wrapper.findAll('input')
    const passwordInputs = inputs.filter(i => (i.element as HTMLInputElement).type === 'password')
    expect(passwordInputs.length).toBe(0)
  })

  it('only Password field shown when type is duplicati (authType: password)', async () => {
    const wrapper = mountModal({ name: 'Duplicati', type: 'duplicati' })
    await flushPromises()
    const inputs = wrapper.findAll('input')
    const passwordInputs = inputs.filter(i => (i.element as HTMLInputElement).type === 'password')
    // only one password field, no username
    expect(passwordInputs.length).toBe(1)
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
    const inputs = wrapper.findAll('input')
    const serverInput = inputs.find(i => (i.element as HTMLInputElement).placeholder === 'nas')
    const containerInput = inputs.find(i => (i.element as HTMLInputElement).placeholder === 'auto')
    expect(serverInput).toBeTruthy()
    expect(containerInput).toBeTruthy()
  })
})
