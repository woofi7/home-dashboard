import { defineStore } from 'pinia'
import { useConfigStore } from './config'
import { useViewStore } from './view'
import { useStatusStore } from './status'
import { useWidgetCardsStore } from './widgetCards'
import { useBookmarkClicksStore } from './bookmarkClicks'

let listenersBound = false

export const useConnectivityStore = defineStore('connectivity', {
  state: () => ({
    online: true,
    lastChecked: 0,
  }),
  getters: {
    lastSnapshotAt(): number {
      return Math.max(
        useConfigStore().lastUpdated,
        useViewStore().lastUpdated,
        useStatusStore().lastUpdated,
        useWidgetCardsStore().lastUpdated,
        useBookmarkClicksStore().lastUpdated,
      )
    },
  },
  actions: {
    async ping() {
      try {
        await $fetch('/api/healthcheck', { cache: 'no-store' })
        this.online = true
      } catch {
        this.online = false
      }
      this.lastChecked = Date.now()
    },
    initialize() {
      if (listenersBound || !import.meta.client)
        return
      listenersBound = true
      this.online = navigator.onLine
      window.addEventListener('online', () => { this.ping() })
      window.addEventListener('offline', () => { this.online = false })
      this.ping()
    },
  },
})
