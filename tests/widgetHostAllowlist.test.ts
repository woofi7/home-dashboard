import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockLoad } = vi.hoisted(() => ({ mockLoad: vi.fn() }))
vi.mock('../server/utils/config', () => ({ loadConfig: mockLoad }))

import { isConfiguredWidgetHost } from '../server/utils/widgetHostAllowlist'

function withConfig(services: unknown, widgets: unknown) {
  mockLoad.mockImplementation((file: string) => {
    if (file === 'services.yaml') return services
    if (file === 'widgets.yaml') return widgets
    return null
  })
}

beforeEach(() => mockLoad.mockReset())

describe('isConfiguredWidgetHost', () => {
  it('allows a host that appears as a service url', () => {
    withConfig([{ services: [{ url: 'http://sonarr:8989' }] }], [])
    expect(isConfiguredWidgetHost('http://sonarr:8989')).toBe(true)
  })

  it('allows a host configured via widgetUrl', () => {
    withConfig([{ services: [{ url: 'http://x', widgetUrl: 'https://nas:9000' }] }], [])
    expect(isConfiguredWidgetHost('https://nas:9000')).toBe(true)
  })

  it('allows a host from widgets.yaml', () => {
    withConfig([], [{ url: 'http://pihole.local' }])
    expect(isConfiguredWidgetHost('http://pihole.local')).toBe(true)
  })

  it('matches scheme-less and trailing-slash variants by host', () => {
    withConfig([], [{ url: 'nas:8200' }])
    expect(isConfiguredWidgetHost('http://nas:8200/')).toBe(true)
  })

  it('blocks the cloud metadata address when not configured', () => {
    withConfig([{ services: [{ url: 'http://sonarr:8989' }] }], [])
    expect(isConfiguredWidgetHost('http://169.254.169.254/latest/meta-data')).toBe(false)
  })

  it('blocks a different port on a configured host', () => {
    withConfig([], [{ url: 'http://nas:8200' }])
    expect(isConfiguredWidgetHost('http://nas:22')).toBe(false)
  })

  it('rejects empty / non-string / unparseable input', () => {
    withConfig([], [{ url: 'http://nas:8200' }])
    expect(isConfiguredWidgetHost('')).toBe(false)
    expect(isConfiguredWidgetHost(undefined)).toBe(false)
    expect(isConfiguredWidgetHost(42)).toBe(false)
  })
})
