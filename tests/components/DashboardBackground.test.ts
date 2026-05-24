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
    it('applies center position by default', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      expect(thumbDiv(w)?.attributes('style')).toContain('background-position: center')
    })

    it('applies center top for position top', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { position: 'top' })
      expect(thumbDiv(w)?.attributes('style')).toContain('center top')
    })

    it('applies center bottom for position bottom', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { position: 'bottom' })
      expect(thumbDiv(w)?.attributes('style')).toContain('center bottom')
    })

    it('applies left center for position left', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { position: 'left' })
      expect(thumbDiv(w)?.attributes('style')).toContain('left center')
    })
  })

  describe('appearance - overlay', () => {
    it('applies 40% overlay by default', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      expect(overlayDiv(w)?.attributes('style')).toContain('rgba(0, 0, 0, 0.4)')
    })

    it('applies custom overlay opacity', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { overlay: 60 })
      expect(overlayDiv(w)?.attributes('style')).toContain('rgba(0, 0, 0, 0.6)')
    })

    it('applies zero overlay when set to 0', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { overlay: 0 })
      expect(overlayDiv(w)?.attributes('style')).toContain('rgba(0, 0, 0, 0)')
    })
  })

  describe('appearance - blur', () => {
    it('does not apply blur when blur is none', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { blur: 'none' })
      expect(thumbDiv(w)?.attributes('style')).not.toContain('blur')
    })

    it('applies 4px blur for sm', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { blur: 'sm' })
      expect(thumbDiv(w)?.attributes('style')).toContain('blur(4px)')
    })

    it('applies 12px blur for md', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { blur: 'md' })
      expect(thumbDiv(w)?.attributes('style')).toContain('blur(12px)')
    })

    it('applies 24px blur for lg', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { blur: 'lg' })
      expect(thumbDiv(w)?.attributes('style')).toContain('blur(24px)')
    })
  })

  describe('appearance - fade speed', () => {
    it('applies 1000ms transition duration by default', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      expect(thumbDiv(w)?.attributes('style')).toContain('transition-duration: 1000ms')
    })

    it('applies 400ms for fast', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { fadeSpeed: 'fast' })
      expect(thumbDiv(w)?.attributes('style')).toContain('transition-duration: 400ms')
    })

    it('applies 2000ms for slow', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { fadeSpeed: 'slow' })
      expect(thumbDiv(w)?.attributes('style')).toContain('transition-duration: 2000ms')
    })

    it('applies 0ms for none', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { fadeSpeed: 'none' })
      expect(thumbDiv(w)?.attributes('style')).toContain('transition-duration: 0ms')
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
