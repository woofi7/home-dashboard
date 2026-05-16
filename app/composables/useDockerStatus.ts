type DockerStatus = Record<string, { state: string; status: string }>

const dockerStatus = ref<DockerStatus>({})

async function fetchDockerStatus() {
  try {
    dockerStatus.value = await $fetch<DockerStatus>('/api/docker/status')
  } catch { /* ignore */ }
}

let initialized = false

export function useDockerStatus() {
  const { refreshKey } = useWidgetRefresh()

  onMounted(() => {
    if (!initialized) { initialized = true; fetchDockerStatus() }
  })

  watch(refreshKey, fetchDockerStatus)

  return { dockerStatus }
}
