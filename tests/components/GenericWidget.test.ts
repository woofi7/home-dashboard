// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'
import { useWidgetCardsStore } from '~/stores/widgetCards'
import GenericWidget from '~/components/widget/GenericWidget.vue'

function mountWidget(name: string) {
  return mount(GenericWidget, {
    props: { widget: { name, type: 'beszel', url: 'http://b' } },
    global: { stubs: globalStubs },
  })
}

describe('GenericWidget.vue', () => {
  it('renders fields for an ok card', () => {
    useWidgetCardsStore().cards = { CPU: { status: 'ok', data: { fields: [{ label: 'Load', value: '1' }] } } }
    const w = mountWidget('CPU')
    expect(w.text()).toContain('Load')
    expect(w.text()).toContain('1')
  })

  it('shows the error label and tooltip for an error card', () => {
    useWidgetCardsStore().cards = {
      CPU: { status: 'error', data: null, error: { kind: 'unreachable', message: 'Server not responding (ECONNREFUSED)' } },
    }
    const w = mountWidget('CPU')
    expect(w.text()).toContain('Unreachable')
    expect(w.find('.cursor-help').attributes('title')).toContain('Server not responding')
  })

  it('shows Loading while the card is pending', () => {
    useWidgetCardsStore().cards = {}
    const w = mountWidget('CPU')
    expect(w.text()).toContain('Loading')
  })
})
