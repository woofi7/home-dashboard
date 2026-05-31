import { defineStore } from 'pinia'
import { apiFetch } from '~/utils/apiFetch'

type Background = { thumb: string; full: string; author?: string; authorLink?: string; source?: string }
type Weather = Record<string, unknown>
type CalTask = { id: string; listId: string; title: string; due?: string; url: string }
type Calendar = { authorized: boolean; days: unknown[]; tasks: CalTask[] }

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
        apiFetch<Weather>('/api/weather'),
        apiFetch<Calendar>('/api/calendar'),
        apiFetch<Background>('/api/background'),
      ])
      let latest = 0
      if (results[0].status === 'fulfilled') {
        this.weather = results[0].value.data
        latest = Math.max(latest, results[0].value.at)
      }
      if (results[1].status === 'fulfilled') {
        this.calendar = results[1].value.data
        latest = Math.max(latest, results[1].value.at)
      }
      if (results[2].status === 'fulfilled') {
        this.background = results[2].value.data
        latest = Math.max(latest, results[2].value.at)
      }
      if (latest > 0)
        this.lastUpdated = latest
    },
    async completeTask(task: CalTask) {
      if (!this.calendar)
        return
      const prev = this.calendar.tasks
      this.calendar.tasks = prev.filter(t => t.id !== task.id)
      try {
        await $fetch('/api/calendar/task', { method: 'POST', body: { listId: task.listId, taskId: task.id } })
      } catch (err) {
        this.calendar.tasks = prev
        throw err
      }
    },
  },
  persist: true,
})
