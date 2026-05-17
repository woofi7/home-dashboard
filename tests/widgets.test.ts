import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBazarr } from '../server/api/widget/bazarr.get'
import { fetchOverseerr } from '../server/api/widget/overseerr.get'
import { fetchPlex } from '../server/api/widget/plex.get'
import { fetchProwlarr } from '../server/api/widget/prowlarr.get'
import { fetchRadarr } from '../server/api/widget/radarr.get'
import { fetchSonarr } from '../server/api/widget/sonarr.get'
import { fetchReadarr } from '../server/api/widget/readarr.get'
import { fetchTdarr } from '../server/api/widget/tdarr.get'
import { fetchTraefik } from '../server/api/widget/traefik.get'

// getActiveFields returns all labels by default in tests
vi.mock('../server/utils/widget-fields', () => ({
  getActiveFields: (_type: string, labels: string[]) => new Set(labels),
}))

const fetch = vi.fn()
vi.stubGlobal('$fetch', fetch)

beforeEach(() => { fetch.mockReset() })

// ─── Bazarr ───────────────────────────────────────────────────────────────────

describe('fetchBazarr', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchBazarr({ apiKey: 'k' })).toBeNull()
  })

  it('returns null when apiKey is missing', async () => {
    expect(await fetchBazarr({ url: 'http://bazarr' })).toBeNull()
  })

  it('returns correct fields', async () => {
    fetch
      .mockResolvedValueOnce({ episodes: 3, movies: 5 })
      .mockResolvedValueOnce({ data: [{}, {}, {}, {}] })

    const result = await fetchBazarr({ url: 'http://bazarr', apiKey: 'k' })
    expect(result?.fields).toEqual([
      { label: 'Missing episodes', value: 3 },
      { label: 'Missing movies',   value: 5 },
      { label: 'Providers',        value: 4 },
    ])
  })

  it('sends X-API-KEY header', async () => {
    fetch.mockResolvedValue({ episodes: 0, movies: 0, data: [] })
    await fetchBazarr({ url: 'http://bazarr', apiKey: 'secret' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/badges'),
      expect.objectContaining({ headers: { 'X-API-KEY': 'secret' } }),
    )
  })
})

// ─── Overseerr ────────────────────────────────────────────────────────────────

describe('fetchOverseerr', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchOverseerr({ apiKey: 'k' })).toBeNull()
  })

  it('returns null when apiKey is missing', async () => {
    expect(await fetchOverseerr({ url: 'http://overseerr' })).toBeNull()
  })

  it('returns pageInfo.results for each field', async () => {
    const page = (n: number) => ({ pageInfo: { results: n } })
    fetch
      .mockResolvedValueOnce(page(10))
      .mockResolvedValueOnce(page(2))
      .mockResolvedValueOnce(page(3))
      .mockResolvedValueOnce(page(7))
      .mockResolvedValueOnce(page(1))
      .mockResolvedValueOnce(page(50))

    const result = await fetchOverseerr({ url: 'http://overseerr', apiKey: 'k' })
    const values = result?.fields.map(f => f.value)
    expect(values).toEqual([10, 2, 3, 7, 1, 50])
  })
})

// ─── Plex ─────────────────────────────────────────────────────────────────────

describe('fetchPlex', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchPlex({ apiKey: 'k' })).toBeNull()
  })

  it('returns null when apiKey is missing', async () => {
    expect(await fetchPlex({ url: 'http://plex' })).toBeNull()
  })

  it('returns correct fields from MediaContainer.size', async () => {
    const mc = (size: number) => ({ MediaContainer: { size } })
    fetch
      .mockResolvedValueOnce(mc(100))
      .mockResolvedValueOnce(mc(50))
      .mockResolvedValueOnce(mc(3))

    const result = await fetchPlex({ url: 'http://plex', apiKey: 'token' })
    expect(result?.fields).toEqual([
      { label: 'Movies',  value: 100 },
      { label: 'Shows',   value: 50 },
      { label: 'Streams', value: 3 },
    ])
  })

  it('passes token as query param', async () => {
    const mc = (size: number) => ({ MediaContainer: { size } })
    fetch.mockResolvedValue(mc(0))
    await fetchPlex({ url: 'http://plex', apiKey: 'mytoken' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('X-Plex-Token=mytoken'),
      expect.anything(),
    )
  })
})

// ─── Prowlarr ─────────────────────────────────────────────────────────────────

describe('fetchProwlarr', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchProwlarr({ apiKey: 'k' })).toBeNull()
  })

  it('sums stats across indexers', async () => {
    fetch
      .mockResolvedValueOnce([{}, {}, {}])
      .mockResolvedValueOnce({
        indexers: [
          { numberOfGrabs: 10, numberOfQueries: 20, numberOfFailedQueries: 1 },
          { numberOfGrabs: 5,  numberOfQueries: 15, numberOfFailedQueries: 2 },
        ],
      })

    const result = await fetchProwlarr({ url: 'http://prowlarr', apiKey: 'k' })
    expect(result?.fields).toEqual([
      { label: 'Indexers',  value: 3 },
      { label: 'Grabs',     value: 15 },
      { label: 'Queries',   value: 35 },
      { label: 'Failures',  value: 3 },
    ])
  })
})

// ─── Radarr ───────────────────────────────────────────────────────────────────

describe('fetchRadarr', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchRadarr({ apiKey: 'k' })).toBeNull()
  })

  it('counts downloaded movies correctly', async () => {
    fetch
      .mockResolvedValueOnce([
        { hasFile: true },
        { hasFile: false },
        { hasFile: true },
        { hasFile: true },
      ])
      .mockResolvedValueOnce({ totalCount: 2 })
      .mockResolvedValueOnce({ totalRecords: 5 })

    const result = await fetchRadarr({ url: 'http://radarr', apiKey: 'k' })
    expect(result?.fields).toEqual([
      { label: 'Movies',     value: 4 },
      { label: 'Downloaded', value: 3 },
      { label: 'Queued',     value: 2 },
      { label: 'Missing',    value: 5 },
    ])
  })
})

// ─── Sonarr ───────────────────────────────────────────────────────────────────

describe('fetchSonarr', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchSonarr({ apiKey: 'k' })).toBeNull()
  })

  it('counts monitored series correctly', async () => {
    fetch
      .mockResolvedValueOnce([
        { monitored: true },
        { monitored: true },
        { monitored: false },
      ])
      .mockResolvedValueOnce({ totalRecords: 4 })
      .mockResolvedValueOnce({ totalRecords: 7 })
      .mockResolvedValueOnce({ totalRecords: 2 })

    const result = await fetchSonarr({ url: 'http://sonarr', apiKey: 'k' })
    expect(result?.fields).toEqual([
      { label: 'Series',       value: 3 },
      { label: 'Monitored',    value: 2 },
      { label: 'Queued',       value: 4 },
      { label: 'Wanted',       value: 7 },
      { label: 'Cutoff unmet', value: 2 },
    ])
  })
})

// ─── Readarr ──────────────────────────────────────────────────────────────────

describe('fetchReadarr', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchReadarr({ apiKey: 'k' })).toBeNull()
  })

  it('returns correct fields', async () => {
    fetch
      .mockResolvedValueOnce([{}, {}, {}])
      .mockResolvedValueOnce({ totalRecords: 1 })
      .mockResolvedValueOnce([{}, {}])
      .mockResolvedValueOnce({ totalRecords: 3 })

    const result = await fetchReadarr({ url: 'http://readarr', apiKey: 'k' })
    expect(result?.fields).toEqual([
      { label: 'Books',   value: 3 },
      { label: 'Missing', value: 1 },
      { label: 'Authors', value: 2 },
      { label: 'Queue',   value: 3 },
    ])
  })
})

// ─── Tdarr ────────────────────────────────────────────────────────────────────

describe('fetchTdarr', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchTdarr({})).toBeNull()
  })

  it('returns null when stats array is empty', async () => {
    fetch.mockResolvedValueOnce([])
    expect(await fetchTdarr({ url: 'http://tdarr' })).toBeNull()
  })

  it('returns correct fields with suffix', async () => {
    fetch.mockResolvedValueOnce([{ totalFileCount: 200, table2Count: 180, tdarrScore: 92.5 }])

    const result = await fetchTdarr({ url: 'http://tdarr' })
    expect(result?.fields).toEqual([
      { label: 'Files', value: 200 },
      { label: 'Done',  value: 180 },
      { label: 'Score', value: 92.5, suffix: '%' },
    ])
  })

  it('POSTs to /api/v2/cruddb', async () => {
    fetch.mockResolvedValueOnce([{ totalFileCount: 0, table2Count: 0, tdarrScore: 0 }])
    await fetchTdarr({ url: 'http://tdarr' })
    expect(fetch).toHaveBeenCalledWith(
      'http://tdarr/api/v2/cruddb',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

// ─── Traefik ──────────────────────────────────────────────────────────────────

describe('fetchTraefik', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchTraefik({})).toBeNull()
  })

  it('returns correct fields', async () => {
    fetch.mockResolvedValueOnce({
      http: {
        routers:     { total: 12 },
        services:    { total: 8 },
        middlewares: { total: 4 },
      },
    })

    const result = await fetchTraefik({ url: 'http://traefik' })
    expect(result?.fields).toEqual([
      { label: 'Routers',     value: 12 },
      { label: 'Services',    value: 8 },
      { label: 'Middlewares', value: 4 },
    ])
  })

  it('sends Basic auth header when credentials provided', async () => {
    fetch.mockResolvedValueOnce({ http: { routers: { total: 0 }, services: { total: 0 }, middlewares: { total: 0 } } })
    await fetchTraefik({ url: 'http://traefik', username: 'admin', password: 'pass' })
    const expectedToken = Buffer.from('admin:pass').toString('base64')
    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ headers: { Authorization: `Basic ${expectedToken}` } }),
    )
  })

  it('sends no auth header when credentials are absent', async () => {
    fetch.mockResolvedValueOnce({ http: { routers: { total: 0 }, services: { total: 0 }, middlewares: { total: 0 } } })
    await fetchTraefik({ url: 'http://traefik' })
    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ headers: {} }),
    )
  })
})
