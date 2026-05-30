import { defineStore } from 'pinia'
import { useConfigStore } from './config'

type WidgetField = { label: string; value: unknown; suffix?: string }
type WidgetResult = { fields: WidgetField[] }
type CardState = { status: 'loading' | 'ok' | 'error'; data: WidgetResult | null }

export const useWidgetCardsStore = defineStore('widgetCards', {
  state: () => ({
    cards: {} as Record<string, CardState>,
    lastUpdated: 0,
  }),
  getters: {
    byName: (state) => (name: string): CardState | undefined => state.cards[name],
  },
  actions: {
    async load() {
      await this.refresh()
    },
    async refresh() {
      const widgets = useConfigStore().config.widgets as Array<Record<string, unknown>>
      await Promise.all(widgets.map(async (w) => {
        const name = w.name as string
        const type = w.type as string
        const url = w.url as string
        if (!this.cards[name])
          this.cards[name] = { status: 'loading', data: null }
        try {
          const data = await $fetch<WidgetResult>(`/api/widget/${type}?url=${encodeURIComponent(url)}`)
          this.cards[name] = { status: 'ok', data }
          this.lastUpdated = Date.now()
        } catch {
          this.cards[name] = { status: this.cards[name]?.data ? 'ok' : 'error', data: this.cards[name]?.data ?? null }
        }
      }))
    },
  },
  persist: true,
})
