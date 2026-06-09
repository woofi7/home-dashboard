import { loadConfig } from './config'
import { externalUrl } from '#shared/externalUrl'

type ServiceGroup = { services?: Array<Record<string, unknown>> }
type Widget = Record<string, unknown>

// Normalise any configured/requested value to a comparable "host:port" key.
// Returns null for anything that isn't a parseable URL/host.
function hostOf(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim())
    return null
  try {
    const u = externalUrl(raw.trim())
    const withScheme = u.startsWith('//') ? `http:${u}` : u
    return new URL(withScheme).host.toLowerCase()
  } catch {
    return null
  }
}

// Every host the dashboard is configured to talk to: service URLs/healthchecks
// from services.yaml and widget URLs from widgets.yaml.
function configuredHosts(): Set<string> {
  const hosts = new Set<string>()

  for (const group of loadConfig<ServiceGroup[]>('services.yaml') ?? []) {
    for (const s of group.services ?? []) {
      for (const h of [hostOf(s.url), hostOf(s.widgetUrl), hostOf(s.healthcheck)])
        if (h) hosts.add(h)
    }
  }

  for (const w of loadConfig<Widget[]>('widgets.yaml') ?? []) {
    const h = hostOf(w.url)
    if (h) hosts.add(h)
  }

  return hosts
}

// Anti-SSRF guard for the public widget proxy endpoints. A caller may only make
// the server fetch a host that already appears in the saved configuration. This
// blocks an unauthenticated request from coercing the server into reaching
// arbitrary internal or cloud-metadata addresses (e.g. 169.254.169.254) while
// still allowing the private LAN hosts the dashboard is legitimately set up to
// reach — so we intentionally do NOT block private IP ranges.
export function isConfiguredWidgetHost(url: unknown): boolean {
  const host = hostOf(url)
  if (!host)
    return false
  return configuredHosts().has(host)
}
