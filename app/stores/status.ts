import { defineStore } from 'pinia'
import { apiFetch } from '~/utils/apiFetch'
import type { WidgetOutcome } from '~/utils/widgetError'

type DockerContainerStatus = { state: string; status: string }
type DockerStatus = Record<string, Record<string, DockerContainerStatus>>
type RefreshData = {
  docker: DockerStatus
  ping: Record<string, boolean>
  widgets: Record<string, WidgetOutcome>
}

export const useStatusStore = defineStore('status', {
  state: () => ({
    dockerStatus: {} as DockerStatus,
    pingStatus: {} as Record<string, boolean>,
    widgetData: {} as Record<string, WidgetOutcome>,
    lastUpdated: 0,
  }),
  actions: {
    async load() {
      await this.refresh()
    },
    async refresh(force = false) {
      try {
        const { data, at } = await apiFetch<RefreshData>('/api/refresh', force ? { headers: { 'x-refresh-force': '1' } } : {})
        this.dockerStatus = data.docker
        this.pingStatus = data.ping
        this.widgetData = data.widgets
        this.lastUpdated = at
      } catch { /* keep last snapshot */ }
    },
  },
  persist: true,
})
