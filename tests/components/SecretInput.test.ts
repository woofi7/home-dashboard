// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'

vi.stubGlobal('parseEnvRef', (v: string) => {
  const m = v?.match(/^\$\{([^}]+)\}$/)
  return m?.[1] ?? null
})

import SecretInput from '~/components/admin/SecretInput.vue'

function mountInput(modelValue = '', suggestedVar = 'MY_SECRET') {
  return mount(SecretInput, {
    props: { modelValue, suggestedVar, placeholder: 'Enter secret' },
    global: { stubs: globalStubs },
  })
}

describe('SecretInput.vue', () => {
  it('renders an input with the given placeholder', () => {
    const wrapper = mountInput()
    expect(wrapper.find('input').attributes('placeholder')).toBe('Enter secret')
  })

  it('input type is password by default', () => {
    const wrapper = mountInput()
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })

  it('shows the eye toggle button', () => {
    const wrapper = mountInput()
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('toggles to text type when eye button is clicked', async () => {
    const wrapper = mountInput()
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')
  })

  it('toggles back to password on second click', async () => {
    const wrapper = mountInput()
    await wrapper.find('button').trigger('click')
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })

  it('shows "use ${VAR}" button when value is empty', () => {
    const wrapper = mountInput('')
    expect(wrapper.text()).toContain('use ${MY_SECRET}')
  })

  it('clicking "use env var" button emits the ${VAR} reference', async () => {
    const wrapper = mountInput('')
    const useBtn = wrapper.findAll('button').find(b => b.text().includes('use'))
    await useBtn!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['${MY_SECRET}'])
  })

  it('shows green env badge when value is a ${VAR} reference', () => {
    const wrapper = mountInput('${MY_SECRET}')
    expect(wrapper.text()).toContain('from env: MY_SECRET')
  })

  it('hides the eye toggle button when value is an env reference', () => {
    const wrapper = mountInput('${MY_SECRET}')
    const buttons = wrapper.findAll('button')
    const eyeBtn = buttons.find(b => b.classes().some(c => c.includes('absolute')))
    expect(eyeBtn).toBeFalsy()
  })

  it('uses text type when value is an env reference (no masking needed)', () => {
    const wrapper = mountInput('${MY_SECRET}')
    expect(wrapper.find('input').attributes('type')).toBe('text')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mountInput()
    await wrapper.find('input').setValue('newsecret')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['newsecret'])
  })

  describe('masked=false (username / non-secret fields)', () => {
    function mountUnmasked(modelValue = '') {
      return mount(SecretInput, {
        props: { modelValue, suggestedVar: 'MY_USER', masked: false },
        global: { stubs: globalStubs },
      })
    }

    it('input type is text when masked=false', () => {
      const wrapper = mountUnmasked()
      expect(wrapper.find('input').attributes('type')).toBe('text')
    })

    it('no eye toggle button when masked=false', () => {
      const wrapper = mountUnmasked()
      const eyeBtn = wrapper.findAll('button').find(b => b.classes().some(c => c.includes('absolute')))
      expect(eyeBtn).toBeFalsy()
    })

    it('still shows "use ${VAR}" button when masked=false', () => {
      const wrapper = mountUnmasked()
      expect(wrapper.text()).toContain('use ${MY_USER}')
    })

    it('shows env badge when value is a ${VAR} reference', () => {
      const wrapper = mountUnmasked('${MY_USER}')
      expect(wrapper.text()).toContain('from env: MY_USER')
    })

    it('shows "use inline" button when value is a ${VAR} reference', () => {
      const wrapper = mountUnmasked('${MY_USER}')
      expect(wrapper.findAll('button').some(b => b.text() === 'use inline')).toBe(true)
    })

    it('clicking "use inline" emits empty string', async () => {
      const wrapper = mountUnmasked('${MY_USER}')
      const useInlineBtn = wrapper.findAll('button').find(b => b.text() === 'use inline')
      await useInlineBtn!.trigger('click')
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
    })
  })

  it('renders without suggestedVar (no env button)', () => {
    const wrapper = mount(SecretInput, {
      props: { modelValue: '', placeholder: 'Secret' },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).not.toContain('use')
  })

  describe('switching back from env ref to inline', () => {
    it('shows "use inline" button when value is an env reference', () => {
      const wrapper = mountInput('${MY_SECRET}')
      const useInlineBtn = wrapper.findAll('button').find(b => b.text() === 'use inline')
      expect(useInlineBtn).toBeTruthy()
    })

    it('clicking "use inline" emits empty string to clear the env ref', async () => {
      const wrapper = mountInput('${MY_SECRET}')
      const useInlineBtn = wrapper.findAll('button').find(b => b.text() === 'use inline')
      await useInlineBtn!.trigger('click')
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
    })

    it('hides "use inline" when value is not an env ref', () => {
      const wrapper = mountInput('mysecretvalue')
      const buttons = wrapper.findAll('button').map(b => b.text())
      expect(buttons).not.toContain('use inline')
    })

    it('shows "use ${VAR}" again after clearing env ref', async () => {
      const wrapper = mountInput('${MY_SECRET}')
      const useInlineBtn = wrapper.findAll('button').find(b => b.text() === 'use inline')
      await useInlineBtn!.trigger('click')
      await wrapper.setProps({ modelValue: '' })
      expect(wrapper.text()).toContain('use ${MY_SECRET}')
    })
  })
})
