import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../server/utils/cache', () => ({
  createCache: () => ({
    get: () => null,
    set: (data: unknown) => data,
    clear: vi.fn(),
    fetch: vi.fn(),
  }),
}))

const mockLoadConfig = vi.fn()
vi.mock('../server/utils/config', () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
}))

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

import handler from '../server/api/background.get'

beforeEach(() => {
  mockLoadConfig.mockReset()
  mockFetch.mockReset()
})

describe('background.get', () => {
  describe('provider: none / missing', () => {
    it('returns null when no background key in settings', async () => {
      mockLoadConfig.mockReturnValue({})
      expect(await handler()).toBeNull()
    })

    it('returns null when settings is null', async () => {
      mockLoadConfig.mockReturnValue(null)
      expect(await handler()).toBeNull()
    })

    it('returns null for provider none', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'none' } })
      expect(await handler()).toBeNull()
    })
  })

  describe('provider: url', () => {
    it('returns null when url is not set', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'url' } })
      expect(await handler()).toBeNull()
    })

    it('returns thumb and full set to the same url', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'url', url: 'https://example.com/bg.jpg' } })
      expect(await handler()).toEqual({
        thumb: 'https://example.com/bg.jpg',
        full: 'https://example.com/bg.jpg',
      })
    })
  })

  describe('provider: upload', () => {
    it('returns background-file endpoint', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'upload' } })
      expect(await handler()).toEqual({
        thumb: '/api/background-file',
        full: '/api/background-file',
      })
    })
  })

  describe('provider: picsum', () => {
    it('returns picsum URLs with todays date as seed', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'picsum' } })
      const result = await handler() as Record<string, string>
      expect(result).not.toBeNull()
      expect(result.thumb).toContain('picsum.photos/seed/')
      expect(result.full).toContain('picsum.photos/seed/')
      expect(result.full).toContain('1920/1080')
      expect(result.thumb).toContain('1200/675')
    })

    it('makes no external fetch call', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'picsum' } })
      await handler()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('uses the same seed for thumb and full', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'picsum' } })
      const result = await handler() as Record<string, string>
      const thumbSeed = result.thumb.split('/seed/')[1]?.split('/')[0]
      const fullSeed = result.full.split('/seed/')[1]?.split('/')[0]
      expect(thumbSeed).toBe(fullSeed)
    })
  })

  describe('provider: unsplash', () => {
    it('throws when apiKey is missing', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'unsplash' } })
      await expect(handler()).rejects.toThrow()
    })

    it('fetches from unsplash and returns photo data with source', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'unsplash', unsplashApiKey: 'key123', query: 'mountains' } })
      mockFetch.mockResolvedValueOnce({
        urls: { regular: 'https://thumb.jpg', full: 'https://full.jpg' },
        user: { name: 'John Doe' },
        links: { html: 'https://unsplash.com/photos/abc' },
      })
      expect(await handler()).toEqual({
        thumb: 'https://thumb.jpg',
        full: 'https://full.jpg',
        author: 'John Doe',
        authorLink: 'https://unsplash.com/photos/abc',
        source: 'Unsplash',
      })
    })

    it('passes api key in Authorization header', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'unsplash', unsplashApiKey: 'mykey', query: 'forest' } })
      mockFetch.mockResolvedValueOnce({ urls: { regular: '', full: '' }, user: { name: 'x' }, links: { html: '' } })
      await handler()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('query=forest'),
        expect.objectContaining({ headers: { Authorization: 'Client-ID mykey' } }),
      )
    })

    it('url-encodes the query', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'unsplash', unsplashApiKey: 'k', query: 'digital art' } })
      mockFetch.mockResolvedValueOnce({ urls: { regular: '', full: '' }, user: { name: 'x' }, links: { html: '' } })
      await handler()
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('digital%20art'), expect.anything())
    })

    it('uses nature landscape as default query', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'unsplash', unsplashApiKey: 'k' } })
      mockFetch.mockResolvedValueOnce({ urls: { regular: '', full: '' }, user: { name: 'x' }, links: { html: '' } })
      await handler()
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('nature%20landscape'), expect.anything())
    })
  })

  describe('provider: pexels', () => {
    it('throws when apiKey is missing', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'pexels' } })
      await expect(handler()).rejects.toThrow()
    })

    it('returns null when pexels returns no photos', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'pexels', pexelsApiKey: 'k', query: 'ocean' } })
      mockFetch.mockResolvedValueOnce({ photos: [] })
      expect(await handler()).toBeNull()
    })

    it('fetches from pexels and returns photo data with source', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'pexels', pexelsApiKey: 'k', query: 'ocean' } })
      mockFetch.mockResolvedValueOnce({
        photos: [{ src: { large2x: 'https://full.jpg', medium: 'https://thumb.jpg' }, photographer: 'Jane', url: 'https://pexels.com/photo/1' }],
      })
      expect(await handler()).toEqual({
        thumb: 'https://thumb.jpg',
        full: 'https://full.jpg',
        author: 'Jane',
        authorLink: 'https://pexels.com/photo/1',
        source: 'Pexels',
      })
    })

    it('passes api key as Authorization header', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'pexels', pexelsApiKey: 'pxkey', query: 'sky' } })
      mockFetch.mockResolvedValueOnce({ photos: [{ src: { large2x: '', medium: '' }, photographer: 'x', url: '' }] })
      await handler()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pexels.com'),
        expect.objectContaining({ headers: { Authorization: 'pxkey' } }),
      )
    })
  })

  describe('provider: pixabay', () => {
    it('throws when apiKey is missing', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'pixabay' } })
      await expect(handler()).rejects.toThrow()
    })

    it('returns null when pixabay returns no hits', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'pixabay', pixabayApiKey: 'k', query: 'city' } })
      mockFetch.mockResolvedValueOnce({ hits: [] })
      expect(await handler()).toBeNull()
    })

    it('fetches from pixabay and returns photo data with source', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'pixabay', pixabayApiKey: 'k', query: 'forest' } })
      mockFetch.mockResolvedValueOnce({
        hits: [{ largeImageURL: 'https://large.jpg', webformatURL: 'https://web.jpg', user: 'Bob', pageURL: 'https://pixabay.com/1' }],
      })
      expect(await handler()).toEqual({
        thumb: 'https://web.jpg',
        full: 'https://large.jpg',
        author: 'Bob',
        authorLink: 'https://pixabay.com/1',
        source: 'Pixabay',
      })
    })

    it('includes api key and query in the request URL', async () => {
      mockLoadConfig.mockReturnValue({ background: { provider: 'pixabay', pixabayApiKey: 'pbkey', query: 'sunset' } })
      mockFetch.mockResolvedValueOnce({ hits: [{ largeImageURL: '', webformatURL: '', user: 'x', pageURL: '' }] })
      await handler()
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('key=pbkey'))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('sunset'))
    })
  })
})
