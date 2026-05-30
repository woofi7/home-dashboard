// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import DashboardBackground from '~/components/dashboard/DashboardBackground.vue'

type Background = { thumb?: string; full?: string; author?: string; authorLink?: string; source?: string } | null
type Appearance = { position?: string; overlay?: number; blur?: string; fadeSpeed?: string; color?: string } | null

function mountBg(background: Background, appearance?: Appearance) {
  return mount(DashboardBackground, { props: { background, appearance } })
}

function thumbDiv(w: ReturnType<typeof mountBg>) {
  return w.findAll('div').find(d => d.attributes('style')?.includes('background-image'))
}

function overlayDiv(w: ReturnType<typeof mountBg>) {
  return w.findAll('div').find(d => d.attributes('style')?.includes('rgba'))
}

describe('DashboardBackground.vue', () => {
  describe('visibility', () => {
    it('renders nothing when background is null', () => {
      const w = mountBg(null)
      expect(w.find('div').exists()).toBe(false)
    })

    it('renders nothing when background has no thumb', () => {
      const w = mountBg({})
      expect(w.find('div').exists()).toBe(false)
    })

    it('renders when thumb is set', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      expect(w.find('div').exists()).toBe(true)
    })

    it('renders full image div when full is set', () => {
      const w = mountBg({ thumb: 'https://t.jpg', full: 'https://f.jpg' })
      const bgDivs = w.findAll('div').filter(d => d.attributes('style')?.includes('background-image'))
      expect(bgDivs.length).toBe(2)
    })

    it('does not render full image div when full is absent', () => {
      const w = mountBg({ thumb: 'https://t.jpg' })
      const bgDivs = w.findAll('div').filter(d => d.attributes('style')?.includes('background-image'))
      expect(bgDivs.length).toBe(1)
    })

    it('outer wrapper has overflow-hidden to clip blur', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      expect(w.find('div').classes()).toContain('overflow-hidden')
    })
  })

  describe('background image', () => {
    it('sets background-image from thumb', () => {
      const w = mountBg({ thumb: 'https://thumb.jpg' })
      expect(thumbDiv(w)?.attributes('style')).toContain('https://thumb.jpg')
    })

    it('starts with opacity-0 before image loads', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      expect(thumbDiv(w)?.classes()).toContain('opacity-0')
    })
  })

  describe('appearance - position', () => {
    it.each([
      [undefined, 'background-position: center'],
      ['top', 'center top'],
      ['bottom', 'center bottom'],
      ['left', 'left center'],
    ])('position %s applies %s', (position, expected) => {
      const w = mountBg({ thumb: 'https://img.jpg' }, position ? { position } : {})
      expect(thumbDiv(w)?.attributes('style')).toContain(expected)
    })
  })

  describe('appearance - overlay', () => {
    it.each([
      [undefined, 'rgba(0, 0, 0, 0.4)'],
      [60, 'rgba(0, 0, 0, 0.6)'],
      [0, 'rgba(0, 0, 0, 0)'],
    ])('overlay %s applies %s', (overlay, expected) => {
      const w = mountBg({ thumb: 'https://img.jpg' }, overlay === undefined ? {} : { overlay })
      expect(overlayDiv(w)?.attributes('style')).toContain(expected)
    })
  })

  describe('appearance - blur', () => {
    it('does not apply blur when blur is none', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { blur: 'none' })
      expect(thumbDiv(w)?.attributes('style')).not.toContain('blur')
    })

    it.each([
      ['sm', 'blur(4px)'],
      ['md', 'blur(12px)'],
      ['lg', 'blur(24px)'],
    ])('blur %s applies %s', (blur, expected) => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { blur })
      expect(thumbDiv(w)?.attributes('style')).toContain(expected)
    })
  })

  describe('appearance - fade speed', () => {
    it.each([
      [undefined, 'transition-duration: 1000ms'],
      ['fast', 'transition-duration: 400ms'],
      ['slow', 'transition-duration: 2000ms'],
      ['none', 'transition-duration: 0ms'],
    ])('fadeSpeed %s applies %s', (fadeSpeed, expected) => {
      const w = mountBg({ thumb: 'https://img.jpg' }, fadeSpeed ? { fadeSpeed } : {})
      expect(thumbDiv(w)?.attributes('style')).toContain(expected)
    })
  })

  describe('author attribution', () => {
    it('shows author link when author is set', () => {
      const w = mountBg({ thumb: 'https://img.jpg', author: 'Jane Doe', authorLink: 'https://unsplash.com/jane' })
      const link = w.find('a')
      expect(link.exists()).toBe(true)
      expect(link.text()).toContain('Jane Doe')
      expect(link.attributes('href')).toBe('https://unsplash.com/jane')
    })

    it('does not show author link when author is absent', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      expect(w.find('a').exists()).toBe(false)
    })

    it('links open in a new tab', () => {
      const w = mountBg({ thumb: 'https://img.jpg', author: 'x', authorLink: 'https://u.com' })
      expect(w.find('a').attributes('target')).toBe('_blank')
    })

    it('shows source alongside author', () => {
      const w = mountBg({ thumb: 'https://img.jpg', author: 'Jane', authorLink: '', source: 'Unsplash' })
      expect(w.find('a').text()).toContain('on Unsplash')
    })
  })

  describe('solid color fallback', () => {
    it('renders color div when no thumb and color is set', () => {
      const w = mountBg(null, { color: '#112233' })
      expect(w.find('div').attributes('style')).toContain('#112233')
    })

    it('does not render color div when thumb is present', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { color: '#112233' })
      const colorDiv = w.findAll('div').find(d => d.attributes('style') === 'background-color: rgb(17, 34, 51);')
      expect(colorDiv).toBeFalsy()
    })
  })
})
