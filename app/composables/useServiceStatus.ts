type DockerStatus = Record<string, { state: string; status: string }>
type ServiceStatus = { docker: DockerStatus; ping: Record<string, boolean> }

const status = ref<ServiceStatus>({ docker: {}, ping: {} })

async function fetchStatus() {
  try {
    status.value = await $fetch<ServiceStatus>('/api/status')
  } catch { /* ignore */ }
}

let initialized = false

export function useServiceStatus() {
  const { refreshKey } = useWidgetRefresh()

  onMounted(() => {
    if (!initialized) { initialized = true; fetchStatus() }
  })

  watch(refreshKey, fetchStatus)

  return {
    dockerStatus: computed(() => status.value.docker),
    pingStatus: computed(() => status.value.ping),
  }
}
