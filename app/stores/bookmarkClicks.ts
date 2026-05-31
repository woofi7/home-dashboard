import { defineStore } from 'pinia'
import { apiFetch } from '~/utils/apiFetch'

export const useBookmarkClicksStore = defineStore('bookmarkClicks', {
  state: () => ({
    clicks: {} as Record<string, number>,
    lastUpdated: 0,
  }),
  actions: {
    async load() {
      await this.refresh()
    },
    async refresh() {
      try {
        const { data, at } = await apiFetch<Record<string, number>>('/api/bookmarks/clicks')
        this.clicks = data
        this.lastUpdated = at
      } catch { /* keep last snapshot */ }
    },
    async increment(name: string) {
      this.clicks[name] = (this.clicks[name] ?? 0) + 1
      try {
        await $fetch('/api/bookmarks/clicks', { method: 'POST', body: { name } })
      } catch { /* offline: optimistic count kept locally */ }
    },
  },
  persist: true,
})
