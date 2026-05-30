import { defineStore } from 'pinia'

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
        this.clicks = await $fetch<Record<string, number>>('/api/bookmarks/clicks')
        this.lastUpdated = Date.now()
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
