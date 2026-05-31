import { defineStore } from 'pinia'
import { useConfigStore } from './config'
import { apiFetch } from '~/utils/apiFetch'
import { isWidgetError, type WidgetErrorInfo, type WidgetOutcome, type WidgetResult } from '~/utils/widgetError'

type CardState = { status: 'loading' | 'ok' | 'error'; data: WidgetResult | null; error?: WidgetErrorInfo }

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
          const { data: outcome, at } = await apiFetch<WidgetOutcome>(`/api/widget/${type}?url=${encodeURIComponent(url)}`)
          if (isWidgetError(outcome))
            this.cards[name] = { status: 'error', data: this.cards[name]?.data ?? null, error: outcome.error }
          else
            this.cards[name] = { status: 'ok', data: outcome }
          this.lastUpdated = Math.max(this.lastUpdated, at)
        } catch {
          this.cards[name] = {
            status: this.cards[name]?.data ? 'ok' : 'error',
            data: this.cards[name]?.data ?? null,
            error: { kind: 'unreachable', message: 'Dashboard server unreachable' },
          }
        }
      }))
    },
  },
  persist: true,
})
