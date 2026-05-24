// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'

vi.stubGlobal('envVarName', (type: string, field: string) => `${type.toUpperCase()}_${field.toUpperCase()}`)
vi.stubGlobal('parseEnvRef', (v: string) => {
  const m = v?.match(/^\$\{([^}]+)\}$/)
  return m?.[1] ?? null
})

import CredentialFields from '~/components/edit/modal/CredentialFields.vue'

function mountFields(authType: string, overrides: Record<string, unknown> = {}) {
  return mount(CredentialFields, {
    props: {
      authType,
      credsLoading: false,
      apiKey: '',
      username: '',
      password: '',
      widgetType: 'sonarr',
      ...overrides,
    },
    global: { stubs: globalStubs },
  })
}

describe('CredentialFields.vue', () => {
  describe('authType: none', () => {
    it('renders nothing', () => {
      const wrapper = mountFields('none')
      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.find('.use-env-var').exists()).toBe(false)
    })
  })

  describe('authType: apiKey', () => {
    it('renders a SecretInput for the API key', () => {
      const wrapper = mountFields('apiKey')
      expect(wrapper.find('input').exists()).toBe(true)
      expect(wrapper.find('.use-env-var').exists()).toBe(true)
    })

    it('SecretInput receives the suggested env var', () => {
      const wrapper = mountFields('apiKey', { apiKey: '' })
      expect(wrapper.text()).toContain('use env')
    })

    it('emits update:apiKey when SecretInput emits', async () => {
      const wrapper = mountFields('apiKey')
      await wrapper.find('input').setValue('mykey')
      expect(wrapper.emitted('update:apiKey')?.[0]).toEqual(['mykey'])
    })

    it('shows env badge when apiKey is a ${VAR} ref', () => {
      const wrapper = mountFields('apiKey', { apiKey: '${SONARR_APIKEY}' })
      expect(wrapper.text()).toContain('use env')
    })
  })

  describe('authType: password', () => {
    it('renders a SecretInput for the password', () => {
      const wrapper = mountFields('password')
      expect(wrapper.find('input').exists()).toBe(true)
      expect(wrapper.find('.use-env-var').exists()).toBe(true)
    })

    it('does not render a username field', () => {
      const wrapper = mountFields('password')
      expect(wrapper.findAll('input').length).toBe(1)
    })

    it('emits update:password when SecretInput emits', async () => {
      const wrapper = mountFields('password')
      await wrapper.find('input').setValue('secret')
      expect(wrapper.emitted('update:password')?.[0]).toEqual(['secret'])
    })
  })

  describe('authType: basic', () => {
    it('renders two SecretInputs (username + password)', () => {
      const wrapper = mountFields('basic')
      expect(wrapper.findAll('input').length).toBe(2)
      expect(wrapper.findAll('.use-env-var').length).toBe(2)
    })

    it('username SecretInput is not masked (text type)', () => {
      const wrapper = mountFields('basic')
      const inputs = wrapper.findAll('input')
      expect(inputs[0].attributes('type')).toBe('text')
    })

    it('emits update:username from the first SecretInput', async () => {
      const wrapper = mountFields('basic')
      await wrapper.findAll('input')[0].setValue('admin')
      expect(wrapper.emitted('update:username')?.[0]).toEqual(['admin'])
    })

    it('emits update:password from the second SecretInput', async () => {
      const wrapper = mountFields('basic')
      await wrapper.findAll('input')[1].setValue('pass')
      expect(wrapper.emitted('update:password')?.[0]).toEqual(['pass'])
    })

    it('shows env badge for username when it is a ${VAR} ref', () => {
      const wrapper = mountFields('basic', { username: '${SONARR_USERNAME}' })
      expect(wrapper.text()).toContain('use env')
    })
  })

  describe('disabled while loading', () => {
    it('disables inputs when credsLoading is true', () => {
      const wrapper = mountFields('apiKey', { credsLoading: true })
      expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    })
  })
})
