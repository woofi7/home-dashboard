// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())

type DockerServerConfig = { host?: string; port?: number; socket?: string }

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

const pingData = ref<Record<string, boolean>>({ local: true })

function makeUseFetch(servers: Record<string, DockerServerConfig> = {}) {
  const serversData = ref<Record<string, DockerServerConfig>>(servers)
  const refresh = vi.fn().mockImplementation(() => {
    const lastPost = [...mockFetch.mock.calls].reverse()
      .find((c) => (c[1] as { method?: string })?.method === 'POST')
    if (lastPost)
      serversData.value = (lastPost[1] as { body: Record<string, DockerServerConfig> }).body
  })
  return vi.fn((url: string) => {
    if (url === '/api/admin/docker')
      return { data: serversData, refresh, pending: ref(false) }
    if (url === '/api/admin/docker-ping')
      return { data: pingData, refresh: vi.fn(), pending: ref(false) }
    return { data: ref(null), refresh: vi.fn(), pending: ref(false) }
  })
}

vi.stubGlobal('useFetch', makeUseFetch())
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useAuth', () => ({
  editEnabled: ref(true),
  needsLogin: ref(false),
}))

import AdminDocker from '~/pages/admin/docker.vue'

async function mountPage(servers: Record<string, DockerServerConfig> = {}) {
  vi.stubGlobal('useFetch', makeUseFetch(servers))
  mockFetch.mockResolvedValue({ ok: true })
  const App = defineComponent({
    components: { AdminDocker },
    template: '<Suspense><AdminDocker /></Suspense>',
  })
  const wrapper = mount(App, { global: { stubs: globalStubs } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({ ok: true })
})

describe('admin/docker.vue', () => {
  it('always shows built-in localhost entry', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('local')
    expect(wrapper.text()).toContain('always available')
  })

  it('shows configured servers from docker.yaml', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    expect(wrapper.text()).toContain('nas')
    expect(wrapper.text()).toContain('http://10.0.1.2')
  })

  it('shows "No remote servers configured" when docker.yaml is empty', async () => {
    const wrapper = await mountPage({})
    expect(wrapper.text()).toContain('No remote servers configured')
  })

  it('clicking delete removes server from list', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    const trashBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Remove server')
    await trashBtn!.trigger('click')
    expect(wrapper.text()).not.toContain('http://10.0.1.2')
  })

  it('shows add form when clicking "Add server"', async () => {
    const wrapper = await mountPage()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add server'))
    await addBtn!.trigger('click')
    expect(wrapper.text()).toContain('New server')
  })

  it('add form shows error when name is empty', async () => {
    const wrapper = await mountPage()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add server'))
    await addBtn!.trigger('click')
    const addSubmitBtn = wrapper.findAll('button').find(b => b.text() === 'Add')
    await addSubmitBtn!.trigger('click')
    expect(wrapper.text()).toContain('Name is required')
  })

  it('add form shows error when duplicate name is entered', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2' } })
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add server'))
    await addBtn!.trigger('click')
    const nameInput = wrapper.find('input[placeholder="nas"]')
    await nameInput.setValue('nas')
    const addSubmitBtn = wrapper.findAll('button').find(b => b.text() === 'Add')
    await addSubmitBtn!.trigger('click')
    expect(wrapper.text()).toContain('already exists')
  })

  it('add form: HTTP type requires host', async () => {
    const wrapper = await mountPage()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add server'))
    await addBtn!.trigger('click')
    const nameInput = wrapper.find('input[placeholder="nas"]')
    await nameInput.setValue('vps')
    // host is empty, type is http by default
    const addSubmitBtn = wrapper.findAll('button').find(b => b.text() === 'Add')
    await addSubmitBtn!.trigger('click')
    expect(wrapper.text()).toContain('Host is required')
  })

  it('add form: submitting valid HTTP server adds it to list', async () => {
    const wrapper = await mountPage()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add server'))
    await addBtn!.trigger('click')
    await wrapper.find('input[placeholder="nas"]').setValue('vps')
    await wrapper.find('input[placeholder="http://10.0.1.2"]').setValue('http://192.168.1.1')
    const addSubmitBtn = wrapper.findAll('button').find(b => b.text() === 'Add')
    await addSubmitBtn!.trigger('click')
    expect(wrapper.text()).toContain('vps')
    expect(wrapper.text()).toContain('http://192.168.1.1')
  })

  it('save calls POST /api/admin/docker with current servers', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    // Delete the server to make isDirty=true, then save with an empty config
    const trashBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Remove server')
    await trashBtn!.trigger('click')
    const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
    await saveBtn!.trigger('click')
    await flushPromises()
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/docker', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('cancel reverts unsaved deletions', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2' } })
    const trashBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Remove server')
    await trashBtn!.trigger('click')
    expect(wrapper.text()).not.toContain('http://10.0.1.2')
    const cancelBtn = wrapper.findAll('button').find(b => b.text() === 'Cancel')
    await cancelBtn!.trigger('click')
    expect(wrapper.text()).toContain('nas')
  })

  it('edit button opens inline edit form for that server', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    expect(wrapper.text()).not.toContain('Save changes')
    const editBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Edit server')
    await editBtn!.trigger('click')
    expect(wrapper.text()).toContain('Save changes')
    expect(wrapper.text()).toContain('Edit')
  })

  it('edit form pre-fills host and port from existing server', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    const editBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Edit server')
    await editBtn!.trigger('click')
    const hostInput = wrapper.find('input[placeholder="http://10.0.1.2"]')
    expect((hostInput.element as HTMLInputElement).value).toBe('http://10.0.1.2')
    const portInput = wrapper.find('input[placeholder="2375"]')
    expect((portInput.element as HTMLInputElement).value).toBe('2375')
  })

  it('submitting edit updates the server row', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    const editBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Edit server')
    await editBtn!.trigger('click')
    const hostInput = wrapper.find('input[placeholder="http://10.0.1.2"]')
    await hostInput.setValue('http://192.168.1.99')
    const saveChangesBtn = wrapper.findAll('button').find(b => b.text() === 'Save changes')
    await saveChangesBtn!.trigger('click')
    expect(wrapper.text()).toContain('http://192.168.1.99')
    expect(wrapper.text()).not.toContain('Save changes')
  })

  it('edit form shows error when host is empty on submit', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2' } })
    const editBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Edit server')
    await editBtn!.trigger('click')
    const hostInput = wrapper.find('input[placeholder="http://10.0.1.2"]')
    await hostInput.setValue('')
    const saveChangesBtn = wrapper.findAll('button').find(b => b.text() === 'Save changes')
    await saveChangesBtn!.trigger('click')
    expect(wrapper.text()).toContain('Host is required')
  })

  it('clicking edit button again closes the form', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2' } })
    const editBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Edit server')
    await editBtn!.trigger('click')
    expect(wrapper.text()).toContain('Save changes')
    await editBtn!.trigger('click')
    expect(wrapper.text()).not.toContain('Save changes')
  })

  it('opening add form closes any open edit form', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2' } })
    const editBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Edit server')
    await editBtn!.trigger('click')
    expect(wrapper.text()).toContain('Save changes')
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add server'))
    await addBtn!.trigger('click')
    expect(wrapper.text()).not.toContain('Save changes')
    expect(wrapper.text()).toContain('New server')
  })

  // URL preview
  it('server row shows explicit port in URL preview', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    expect(wrapper.text()).toContain('http://10.0.1.2:2375')
  })

  it('server row shows default :2375 when no port configured', async () => {
    const wrapper = await mountPage({ server: { host: 'http://100.75.255.89' } })
    expect(wrapper.text()).toContain('http://100.75.255.89:2375')
  })

  it('socket server row shows socket path', async () => {
    const wrapper = await mountPage({ local2: { socket: '/run/docker.sock' } })
    expect(wrapper.text()).toContain('/run/docker.sock')
  })

  it('socket server row shows default path when socket field omitted', async () => {
    const wrapper = await mountPage({ local2: {} })
    expect(wrapper.text()).toContain('/var/run/docker.sock')
  })

  // Enter key submits edit form
  it('Enter key on host input submits the edit form', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    const editBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Edit server')
    await editBtn!.trigger('click')
    const hostInput = wrapper.find('input[placeholder="http://10.0.1.2"]')
    await hostInput.setValue('http://10.0.1.5')
    await hostInput.trigger('keydown', { key: 'Enter' })
    expect(wrapper.text()).not.toContain('Save changes')
    expect(wrapper.text()).toContain('http://10.0.1.5:2375')
  })

  it('Enter key on port input submits the edit form', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    const editBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Edit server')
    await editBtn!.trigger('click')
    const portInput = wrapper.find('input[placeholder="2375"]')
    await portInput.setValue('2376')
    await portInput.trigger('keydown', { key: 'Enter' })
    expect(wrapper.text()).not.toContain('Save changes')
    expect(wrapper.text()).toContain('http://10.0.1.2:2376')
  })

  it('Enter key on socket input submits the edit form', async () => {
    const wrapper = await mountPage({ local2: { socket: '/var/run/docker.sock' } })
    const editBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Edit server')
    await editBtn!.trigger('click')
    // Switch to socket type (it should already be socket since no host)
    const socketInput = wrapper.find('input[placeholder="/var/run/docker.sock"]')
    await socketInput.setValue('/run/docker.sock')
    await socketInput.trigger('keydown', { key: 'Enter' })
    expect(wrapper.text()).not.toContain('Save changes')
    expect(wrapper.text()).toContain('/run/docker.sock')
  })

  // Number port coercion (trim bug fix)
  it('submitEdit handles numeric port value without crashing', async () => {
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    const editBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Edit server')
    await editBtn!.trigger('click')
    // Simulate what happens when type="number" input sets a numeric value
    const portInput = wrapper.find('input[placeholder="2375"]')
    // Use element.value assignment to bypass Vue's string coercion and set as number string
    await portInput.setValue(9999)
    const saveChangesBtn = wrapper.findAll('button').find(b => b.text() === 'Save changes')
    // Should not throw - previously crashed with .trim() is not a function
    await expect(saveChangesBtn!.trigger('click')).resolves.not.toThrow()
    expect(wrapper.text()).toContain(':9999')
  })

  // Ping status dots
  it('shows green dot for reachable server', async () => {
    pingData.value = { local: true, nas: true }
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    const dots = wrapper.findAll('.bg-success')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('shows red dot for unreachable server', async () => {
    pingData.value = { local: false, nas: false }
    const wrapper = await mountPage({ nas: { host: 'http://10.0.1.2', port: 2375 } })
    const dots = wrapper.findAll('.bg-danger')
    expect(dots.length).toBeGreaterThan(0)
  })
})
