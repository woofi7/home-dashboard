import { useConfigStore } from '~/stores/config'
import { useViewStore } from '~/stores/view'
import { useStatusStore } from '~/stores/status'
import { useWidgetCardsStore } from '~/stores/widgetCards'
import { useBookmarkClicksStore } from '~/stores/bookmarkClicks'
import { useConnectivityStore } from '~/stores/connectivity'
import { useWidgetRefresh } from './useWidgetRefresh'

export function useDashboardData() {
  const config = useConfigStore()
  const view = useViewStore()
  const status = useStatusStore()
  const widgetCards = useWidgetCardsStore()
  const clicks = useBookmarkClicksStore()
  const connectivity = useConnectivityStore()
  const { refreshKey, forceKey } = useWidgetRefresh()

  async function loadAll() {
    await config.load()
    await Promise.all([
      view.load(),
      status.load(),
      widgetCards.load(),
      clicks.load(),
    ])
  }

  onMounted(() => {
    connectivity.initialize()
    loadAll()
  })

  let lastForce = forceKey.value
  watch(refreshKey, async () => {
    const force = forceKey.value !== lastForce
    lastForce = forceKey.value
    // Auto tick only refreshes live status + connectivity. Weather, calendar,
    // widget cards and clicks are static between manual refreshes (matching the
    // original one-shot fetches), so only the force button reloads them.
    const jobs = [status.refresh(force), connectivity.ping()]
    if (force)
      jobs.push(view.refresh(), widgetCards.refresh(), clicks.refresh())
    await Promise.all(jobs)
  })
}
