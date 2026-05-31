import { defineStore } from 'pinia'
import { apiFetch } from '~/utils/apiFetch'

type Service = { name: string; [key: string]: unknown }
type ServiceGroup = { name: string; services: Service[] }
type Bookmark = { name: string; url: string; icon?: string }
type BookmarkGroup = { name: string; bookmarks: Bookmark[] }
export type Config = {
  services: ServiceGroup[]
  bookmarks: BookmarkGroup[]
  widgets: Record<string, unknown>[]
  settings: Record<string, unknown>
}

const emptyConfig = (): Config => ({ services: [], bookmarks: [], widgets: [], settings: {} })

export const useConfigStore = defineStore('config', {
  state: () => ({
    config: emptyConfig(),
    lastUpdated: 0,
    loaded: false,
  }),
  actions: {
    async load() {
      await this.refresh()
    },
    async refresh() {
      try {
        const { data, at } = await apiFetch<Config>('/api/config')
        this.config = data
        this.lastUpdated = at
        this.loaded = true
      } catch { /* keep last snapshot */ }
    },
  },
  persist: true,
})
