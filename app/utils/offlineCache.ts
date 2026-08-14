import { useConfigStore } from '~/stores/config'
import { useViewStore } from '~/stores/view'
import { useStatusStore } from '~/stores/status'
import { useWidgetCardsStore } from '~/stores/widgetCards'
import { useBookmarkClicksStore } from '~/stores/bookmarkClicks'

// Several stores persist an offline snapshot of dashboard data to
// localStorage so the PWA still has something to show without a network. On
// a shared/public machine that snapshot must not survive past the session it
// was fetched in, so wipe it (plus the service worker's response cache)
// whenever the viewer is no longer authenticated.
export function clearOfflineCache(): void {
  useConfigStore().$reset()
  useViewStore().$reset()
  useStatusStore().$reset()
  useWidgetCardsStore().$reset()
  useBookmarkClicksStore().$reset()

  if (import.meta.client && 'caches' in window) {
    caches.delete('api-cache').catch(() => {})
  }
}
