// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { globalStubs } from './helpers'

type DockerServerConfig = { host?: string; port?: number; socket?: string }

const dockerServersData = ref<Record<string, DockerServerConfig>>({})

vi.stubGlobal('useFetch', (url: string) => {
  if (url === '/api/admin/docker')
    return { data: dockerServersData }
  return { data: ref(null) }
})

import DockerField from '~/components/edit/modal/DockerField.vue'

function mountField(server = '', container = '', props: Record<string, unknown> = {}) {
  return mount(DockerField, {
    props: { server, container, ...props },
    global: { stubs: globalStubs },
  })
}

beforeEach(() => {
  dockerServersData.value = {}
})

describe('DockerField.vue — server select', () => {
  it('always includes None and localhost options', async () => {
    const wrapper = mountField()
    await flushPromises()
    const options = wrapper.findAll('option')
    expect(options.some(o => o.element.value === '')).toBe(true)
    expect(options.some(o => o.element.value === 'local')).toBe(true)
  })

  it('shows configured servers as options', async () => {
    dockerServersData.value = { nas: { host: 'http://10.0.1.2', port: 2375 } }
    const wrapper = mountField()
    await flushPromises()
    const options = wrapper.findAll('option')
    expect(options.some(o => o.element.value === 'nas')).toBe(true)
  })

  it('does not duplicate localhost when "local" is in docker.yaml', async () => {
    dockerServersData.value = { local: { socket: '/var/run/docker.sock' } }
    const wrapper = mountField()
    await flushPromises()
    const localOptions = wrapper.findAll('option').filter(o => o.element.value === 'local')
    expect(localOptions.length).toBe(1)
  })

  it('hides container field when server is empty', () => {
    const wrapper = mountField('')
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBe(0)
  })

  it('shows container field when server is selected', () => {
    const wrapper = mountField('local')
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBe(1)
  })

  it('emits update:server when select changes', async () => {
    const wrapper = mountField()
    await flushPromises()
    const select = wrapper.find('select')
    await select.setValue('local')
    expect(wrapper.emitted('update:server')).toBeTruthy()
    expect(wrapper.emitted('update:server')![0]).toEqual(['local'])
  })

  it('clears container when server changes', async () => {
    const wrapper = mountField('local', 'myapp')
    await flushPromises()
    const select = wrapper.find('select')
    await select.setValue('')
    expect(wrapper.emitted('update:container')).toBeTruthy()
    expect(wrapper.emitted('update:container')![0]).toEqual([''])
  })

  it('emits update:container when container input changes', async () => {
    const wrapper = mountField('local', '')
    const input = wrapper.find('input')
    await input.setValue('my-container')
    expect(wrapper.emitted('update:container')).toBeTruthy()
    expect(wrapper.emitted('update:container')![0]).toEqual(['my-container'])
  })

  it('shows containerError when passed', () => {
    const wrapper = mountField('local', '', { containerError: 'Container is required' })
    expect(wrapper.text()).toContain('Container is required')
  })

  it('does not show containerError when server is empty', () => {
    const wrapper = mountField('', '', { containerError: 'Container is required' })
    // Container field is hidden when no server, so error not visible
    expect(wrapper.find('input').exists()).toBe(false)
  })
})
