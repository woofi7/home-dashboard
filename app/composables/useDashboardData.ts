import { useConfigStore } from '~/stores/config'
import { useViewStore } from '~/stores/view'
import { useStatusStore } from '~/stores/status'
import { useWidgetCardsStore } from '~/stores/widgetCards'
import { useBookmarkClicksStore } from '~/stores/bookmarkClicks'
import { useConnectivityStore } from '~/stores/connectivity'
import { useWidgetRefresh } from './useWidgetRefresh'

const WEATHER_INTERVAL   = 30 * 60 * 1000
const CALENDAR_INTERVAL  = 15 * 60 * 1000
const BG_INTERVAL        = 60 * 60 * 1000
const PUBLICTRANSIT_INTERVAL   =  5 * 60 * 1000

export function useDashboardData() {
  const config = useConfigStore()
  const view = useViewStore()
  const status = useStatusStore()
  const widgetCards = useWidgetCardsStore()
  const clicks = useBookmarkClicksStore()
  const connectivity = useConnectivityStore()
  const { refreshKey, forceKey } = useWidgetRefresh()

  const lastWeatherAt   = ref(0)
  const lastCalendarAt  = ref(0)
  const lastBgAt        = ref(0)
  const lastPublictransitAt   = ref(0)

  async function loadAll() {
    await config.load()
    const now = Date.now()
    await Promise.all([
      view.load(),
      status.load(),
      widgetCards.load(),
      clicks.load(),
    ])
    lastWeatherAt.value  = now
    lastCalendarAt.value = now
    lastBgAt.value       = now
    lastPublictransitAt.value  = now
  }

  onMounted(() => {
    connectivity.initialize()
    loadAll()
  })

  let lastForce = forceKey.value
  watch(refreshKey, async () => {
    const force = forceKey.value !== lastForce
    lastForce = forceKey.value
    const now = Date.now()
    const jobs: Promise<unknown>[] = [status.refresh(force), connectivity.ping()]

    if (force) {
      jobs.push(view.refresh(), widgetCards.refresh(), clicks.refresh())
      lastWeatherAt.value  = now
      lastCalendarAt.value = now
      lastBgAt.value       = now
      lastPublictransitAt.value  = now
    } else {
      if (now - lastWeatherAt.value >= WEATHER_INTERVAL) {
        jobs.push(view.refreshWeather())
        lastWeatherAt.value = now
      }
      if (now - lastCalendarAt.value >= CALENDAR_INTERVAL) {
        jobs.push(view.refreshCalendar())
        lastCalendarAt.value = now
      }
      if (now - lastBgAt.value >= BG_INTERVAL) {
        jobs.push(view.refreshBackground())
        lastBgAt.value = now
      }
      if (now - lastPublictransitAt.value >= PUBLICTRANSIT_INTERVAL) {
        jobs.push(view.refreshPublictransit())
        lastPublictransitAt.value = now
      }
    }

    await Promise.all(jobs)
  })
}
