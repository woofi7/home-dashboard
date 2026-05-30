import { defineStore } from 'pinia'
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
        const result = await $fetch<RefreshData>('/api/refresh', force ? { headers: { 'x-refresh-force': '1' } } : {})
        this.dockerStatus = result.docker
        this.pingStatus = result.ping
        this.widgetData = result.widgets
        this.lastUpdated = Date.now()
      } catch { /* keep last snapshot */ }
    },
  },
  persist: true,
})
