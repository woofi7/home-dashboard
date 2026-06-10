const SCHEME_RE = /^([a-z][a-z0-9+.-]*:)?\/\//i
const NO_SLASH_SCHEME_RE = /^(mailto|tel):/i

// Schemes that execute script (or render arbitrary markup) when placed in an
// <a href> — these are the XSS vector and are never allowed in a link.
const DANGEROUS_SCHEMES = new Set(['javascript', 'data', 'vbscript'])

// Extract the URL scheme the way a browser would: it ignores ASCII whitespace
// and control characters embedded in the scheme (e.g. "java\tscript:" or a
// leading newline), so we strip those before reading it. Returns null when
// there is no scheme.
function schemeOf(url: string): string | null {
  const cleaned = url.replace(/[\s\x00-\x1f\x7f]/g, '')
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned)
  return m ? m[1].toLowerCase() : null
}

export function hasScheme(url: string): boolean {
  return SCHEME_RE.test(url) || NO_SLASH_SCHEME_RE.test(url)
}

// For browser links: pick a single href, defaulting to http when no scheme is
// given. Dangerous schemes (javascript:, data:, vbscript:, including the
// "javascript://%0a…" comment trick) are neutralized to an inert "#" so a
// crafted bookmark/service URL cannot run script when clicked.
export function externalUrl(url: string): string {
  const trimmed = url.trim()
  const scheme = schemeOf(trimmed)
  if (scheme && DANGEROUS_SCHEMES.has(scheme))
    return '#'
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
