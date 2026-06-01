const SCHEME_RE = /^([a-z][a-z0-9+.-]*:)?\/\//i
const NO_SLASH_SCHEME_RE = /^(mailto|tel):/i

export function hasScheme(url: string): boolean {
  return SCHEME_RE.test(url) || NO_SLASH_SCHEME_RE.test(url)
}

// For browser links: pick a single href, defaulting to http when no scheme is given.
export function externalUrl(url: string): string {
  const trimmed = url.trim()
  return hasScheme(trimmed) ? trimmed : `http://${trimmed}`
}

// For server-side fetches: candidates to try in order. A scheme-less URL is
// tried over https first, then http, so public TLS hosts and plain-http LAN
// hosts both work without an explicit scheme. An explicit scheme is respected.
export function fetchCandidates(url: string): string[] {
  const trimmed = url.trim()
  if (hasScheme(trimmed))
    return [trimmed]
  return [`https://${trimmed}`, `http://${trimmed}`]
}
