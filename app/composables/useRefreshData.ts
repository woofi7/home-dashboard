import { effectScope } from 'vue'

type DockerStatus = Record<string, { state: string; status: string }>
type WidgetField = { label: string; value: unknown; suffix?: string }
type WidgetResult = { fields: WidgetField[] }
type RefreshData = {
  docker: DockerStatus
  ping: Record<string, boolean>
  widgets: Record<string, WidgetResult | null>
}

const data = ref<RefreshData>({ docker: {}, ping: {}, widgets: {} })

async function fetchAll(force = false) {
  try {
    data.value = await $fetch<RefreshData>('/api/refresh', force ? { params: { force: '1' } } : {})
  } catch { /* ignore */ }
}

let consumers = 0
let scope: ReturnType<typeof effectScope> | null = null

export function useRefreshData() {
  const { refreshKey, forceKey } = useWidgetRefresh()

  onMounted(() => {
    if (++consumers === 1) {
      fetchAll()
      scope = effectScope(true)
      scope.run(() => {
        let lastForce = forceKey.value
        watch(refreshKey, () => {
          const bust = forceKey.value !== lastForce
          lastForce = forceKey.value
          fetchAll(bust)
        })
      })
    }
  })

  onUnmounted(() => {
    if (--consumers === 0) {
      scope?.stop()
      scope = null
    }
  })

  return {
    dockerStatus: computed(() => data.value.docker),
    pingStatus: computed(() => data.value.ping),
    widgetData: computed(() => data.value.widgets),
  }
}
