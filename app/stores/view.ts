import { defineStore } from 'pinia'

type Background = { thumb: string; full: string; author?: string; authorLink?: string; source?: string }
type Weather = Record<string, unknown>
type Calendar = { authorized: boolean; days: unknown[]; tasks: unknown[] }

export const useViewStore = defineStore('view', {
  state: () => ({
    weather: null as Weather | null,
    calendar: null as Calendar | null,
    background: null as Background | null,
    lastUpdated: 0,
  }),
  actions: {
    async load() {
      await this.refresh()
    },
    async refresh() {
      const results = await Promise.allSettled([
        $fetch<Weather>('/api/weather'),
        $fetch<Calendar>('/api/calendar'),
        $fetch<Background>('/api/background'),
      ])
      if (results[0].status === 'fulfilled')
        this.weather = results[0].value
      if (results[1].status === 'fulfilled')
        this.calendar = results[1].value
      if (results[2].status === 'fulfilled')
        this.background = results[2].value
      if (results.some(r => r.status === 'fulfilled'))
        this.lastUpdated = Date.now()
    },
  },
  persist: true,
})
