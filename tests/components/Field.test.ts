// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Field from '~/components/edit/Field.vue'

describe('Field.vue', () => {
  it('renders label text', () => {
    const wrapper = mount(Field, { props: { label: 'My Label' } })
    expect(wrapper.find('label').text()).toContain('My Label')
  })

  it('shows asterisk in span.text-danger when required', () => {
    const wrapper = mount(Field, { props: { label: 'Name', required: true } })
    const asterisk = wrapper.find('span.text-danger')
    expect(asterisk.exists()).toBe(true)
    expect(asterisk.text()).toBe('*')
  })

  it('does not show asterisk when required is false', () => {
    const wrapper = mount(Field, { props: { label: 'Name', required: false } })
    expect(wrapper.find('span.text-danger').exists()).toBe(false)
  })

  it('does not show asterisk when required is absent', () => {
    const wrapper = mount(Field, { props: { label: 'Name' } })
    expect(wrapper.find('span.text-danger').exists()).toBe(false)
  })

  it('renders default slot content', () => {
    const wrapper = mount(Field, {
      props: { label: 'Name' },
      slots: { default: '<input class="test-input" />' },
    })
    expect(wrapper.find('input.test-input').exists()).toBe(true)
  })
})
