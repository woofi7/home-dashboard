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

async function fetchAll() {
  try {
    data.value = await $fetch<RefreshData>('/api/refresh')
  } catch { /* ignore */ }
}

let consumers = 0
let scope: ReturnType<typeof effectScope> | null = null

export function useRefreshData() {
  const { refreshKey } = useWidgetRefresh()

  onMounted(() => {
    if (++consumers === 1) {
      fetchAll()
      scope = effectScope(true)
      scope.run(() => watch(refreshKey, fetchAll))
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
