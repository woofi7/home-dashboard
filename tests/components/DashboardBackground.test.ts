// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import DashboardBackground from '~/components/dashboard/DashboardBackground.vue'

type Background = { thumb?: string; full?: string; author?: string; authorLink?: string } | null
type Appearance = { position?: string; overlay?: number; blur?: string; fadeSpeed?: string } | null

function mountBg(background: Background, appearance?: Appearance) {
  return mount(DashboardBackground, { props: { background, appearance } })
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
      const bgDivs = w.findAll('div').filter(d => d.attributes('style')?.includes('backgroundImage') || d.attributes('style')?.includes('background-image'))
      expect(bgDivs.length).toBe(2)
    })

    it('does not render full image div when full is absent', () => {
      const w = mountBg({ thumb: 'https://t.jpg' })
      const divs = w.findAll('div')
      // only thumb div + overlay div
      expect(divs.length).toBe(2)
    })
  })

  describe('background image', () => {
    it('sets background-image from thumb', () => {
      const w = mountBg({ thumb: 'https://thumb.jpg' })
      expect(w.find('div').attributes('style')).toContain('https://thumb.jpg')
    })

    it('starts with opacity-0 before image loads', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      expect(w.find('div').classes()).toContain('opacity-0')
    })
  })

  describe('appearance - position', () => {
    it('applies center position by default', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      expect(w.find('div').attributes('style')).toContain('background-position: center')
    })

    it('applies center top for position top', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { position: 'top' })
      expect(w.find('div').attributes('style')).toContain('center top')
    })

    it('applies center bottom for position bottom', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { position: 'bottom' })
      expect(w.find('div').attributes('style')).toContain('center bottom')
    })

    it('applies left center for position left', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { position: 'left' })
      expect(w.find('div').attributes('style')).toContain('left center')
    })
  })

  describe('appearance - overlay', () => {
    it('applies 40% overlay by default', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      const overlay = w.findAll('div').find(d => d.attributes('style')?.includes('rgba'))
      expect(overlay?.attributes('style')).toContain('rgba(0, 0, 0, 0.4)')
    })

    it('applies custom overlay opacity', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { overlay: 60 })
      const overlay = w.findAll('div').find(d => d.attributes('style')?.includes('rgba'))
      expect(overlay?.attributes('style')).toContain('rgba(0, 0, 0, 0.6)')
    })

    it('applies zero overlay when set to 0', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { overlay: 0 })
      const overlay = w.findAll('div').find(d => d.attributes('style')?.includes('rgba'))
      expect(overlay?.attributes('style')).toContain('rgba(0, 0, 0, 0)')
    })
  })

  describe('appearance - blur', () => {
    it('does not apply blur when blur is none', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { blur: 'none' })
      expect(w.find('div').attributes('style')).not.toContain('blur')
    })

    it('applies 4px blur for sm', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { blur: 'sm' })
      expect(w.find('div').attributes('style')).toContain('blur(4px)')
    })

    it('applies 12px blur for md', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { blur: 'md' })
      expect(w.find('div').attributes('style')).toContain('blur(12px)')
    })

    it('applies 24px blur for lg', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { blur: 'lg' })
      expect(w.find('div').attributes('style')).toContain('blur(24px)')
    })
  })

  describe('appearance - fade speed', () => {
    it('applies 1000ms transition duration by default', () => {
      const w = mountBg({ thumb: 'https://img.jpg' })
      expect(w.find('div').attributes('style')).toContain('transition-duration: 1000ms')
    })

    it('applies 400ms for fast', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { fadeSpeed: 'fast' })
      expect(w.find('div').attributes('style')).toContain('transition-duration: 400ms')
    })

    it('applies 2000ms for slow', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { fadeSpeed: 'slow' })
      expect(w.find('div').attributes('style')).toContain('transition-duration: 2000ms')
    })

    it('applies 0ms for none', () => {
      const w = mountBg({ thumb: 'https://img.jpg' }, { fadeSpeed: 'none' })
      expect(w.find('div').attributes('style')).toContain('transition-duration: 0ms')
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
  })
})
