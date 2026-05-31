// Wraps $fetch to also report when the response was generated.
//
// /api/* is served through a NetworkFirst service-worker cache, so while
// offline a $fetch still resolves from cache. Stamping lastUpdated with
// Date.now() there would report the page-load time instead of the snapshot
// time. The response `Date` header is preserved in the cached response, so it
// gives the real moment the data was produced; we fall back to now when it is
// missing (e.g. a live network response without the header).
export async function apiFetch<T>(url: string, opts: Record<string, unknown> = {}): Promise<{ data: T; at: number }> {
  let at = Date.now()
  const data = await $fetch<T>(url, {
    ...opts,
    onResponse({ response }: { response: Response }) {
      const header = response.headers.get('date')
      const parsed = header ? new Date(header).getTime() : Number.NaN
      if (!Number.isNaN(parsed))
        at = parsed
    },
  } as Parameters<typeof $fetch>[1])
  return { data, at }
}
