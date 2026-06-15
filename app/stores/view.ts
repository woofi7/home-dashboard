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
      await Promise.all([
        this.refreshWeather(),
        this.refreshCalendar(),
        this.refreshBackground(),
      ])
    },
    async refreshWeather() {
      const result = await apiFetch<Weather>('/api/weather').catch(() => null)
      if (result) {
        this.weather = result.data
        if (result.at > 0)
          this.lastUpdated = Math.max(this.lastUpdated, result.at)
      }
    },
    async refreshCalendar() {
      const result = await apiFetch<Calendar>('/api/calendar').catch(() => null)
      if (result) {
        this.calendar = result.data
        if (result.at > 0)
          this.lastUpdated = Math.max(this.lastUpdated, result.at)
      }
    },
    async refreshBackground() {
      const result = await apiFetch<Background>('/api/background').catch(() => null)
      if (result) {
        this.background = result.data
        if (result.at > 0)
          this.lastUpdated = Math.max(this.lastUpdated, result.at)
      }
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
