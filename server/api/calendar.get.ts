import { loadConfig } from '../utils/config'
import { createCache } from '../utils/cache'

type CalEvent = { id: string; summary: string; start: string; end: string; allDay: boolean; location?: string; url: string; color?: string }

const GCAL_COLORS: Record<string, string> = {
  '1':  '#7986CB', // Lavender
  '2':  '#33B679', // Sage
  '3':  '#8E24AA', // Grape
  '4':  '#E67C73', // Flamingo
  '5':  '#F6BF26', // Banana
  '6':  '#F4511E', // Tangerine
  '7':  '#039BE5', // Peacock
  '8':  '#616161', // Graphite
  '9':  '#3F51B5', // Blueberry
  '10': '#0F9D58', // Basil
  '11': '#D50000', // Tomato
}
type CalTask  = { id: string; title: string; due?: string; notes?: string; url: string }
type CalDay   = { label: string; date: string; timed: CalEvent[]; allDay: CalEvent[] }

const tokenCache = createCache<string>()

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const hit = tokenCache.get()
  if (hit)
    return hit

  const res = await $fetch<{ access_token: string; expires_in: number }>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }).toString(),
  })

  return tokenCache.set(res.access_token, (res.expires_in - 60) * 1000)
}

function dayLabel(offset: number, date: Date): string {
  if (offset === 0)
    return 'Today'
  if (offset === 1)
    return 'Tomorrow'
  return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
}

function pad(n: number) { return String(n).padStart(2, '0') }

function dateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default defineEventHandler(async () => {
  const settings = loadConfig<Record<string, unknown>>('settings.yaml')
  const g = (settings?.google ?? {}) as Record<string, unknown>
  const cal = (g.calendar ?? {}) as Record<string, unknown>

  const { clientId, clientSecret, refreshToken } = g as Record<string, string>
  if (!clientId || !clientSecret || !refreshToken)
    return { authorized: false, days: [], tasks: [] }

  const showEvents = (cal.showEvents as boolean) ?? true
  const showTasks  = (cal.showTasks  as boolean) ?? false
  const daysAhead  = Math.max(1, Math.min(30, Number(cal.daysAhead) || 2))

  let accessToken: string
  try {
    accessToken = await getAccessToken(clientId, clientSecret, refreshToken)
  } catch {
    tokenCache.clear()
    return { authorized: false, days: [], tasks: [] }
  }
  const headers = { Authorization: `Bearer ${accessToken}` }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const days: CalDay[] = Array.from({ length: daysAhead }, (_, i) => {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() + i)
    return { label: dayLabel(i, d), date: dateStr(d), timed: [], allDay: [] }
  })

  let tasks: CalTask[] = []

  if (showEvents) {
    try {
      const endOfRange = new Date(startOfToday)
      endOfRange.setDate(endOfRange.getDate() + daysAhead)

      type GItem = { id: string; summary?: string; htmlLink?: string; colorId?: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; location?: string }
      const res = await $fetch<{ items: GItem[] }>(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfToday.toISOString()}&timeMax=${endOfRange.toISOString()}&singleEvents=true&orderBy=startTime`,
        { headers }
      )

      const toEvent = (e: GItem): CalEvent => ({
        id: e.id,
        summary: e.summary ?? '(no title)',
        start: e.start.dateTime ?? e.start.date ?? '',
        end: e.end.dateTime ?? e.end.date ?? '',
        allDay: !e.start.dateTime,
        location: e.location,
        url: e.htmlLink ?? '',
        color: e.colorId ? GCAL_COLORS[e.colorId] : undefined,
      })

      for (const e of res.items) {
        const eDate = e.start.dateTime ? e.start.dateTime.slice(0, 10) : (e.start.date ?? '')
        const day = days.find(d => d.date === eDate)
        if (!day)
          continue
        if (e.start.dateTime)
          day.timed.push(toEvent(e))
        else
          day.allDay.push(toEvent(e))
      }
    } catch {
      tokenCache.clear()
    }
  }

  if (showTasks) {
    try {
      const endOfRange = new Date(startOfToday)
      endOfRange.setDate(endOfRange.getDate() + daysAhead)

      type GTaskList = { id: string }
      type GTask = { id: string; title?: string; due?: string; notes?: string; selfLink?: string; status?: string }

      const listsRes = await $fetch<{ items?: GTaskList[] }>('https://www.googleapis.com/tasks/v1/users/@me/lists', { headers })
      const lists = listsRes.items ?? []

      const allTaskArrays = await Promise.all(lists.map(async (list) => {
        const res = await $fetch<{ items?: GTask[] }>(
          `https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks?showCompleted=false&dueMin=${startOfToday.toISOString()}&dueMax=${endOfRange.toISOString()}`,
          { headers }
        )
        return (res.items ?? []).filter(t => t.status !== 'completed')
      }))

      tasks = allTaskArrays.flat().map(t => ({
        id: t.id,
        title: t.title ?? '(no title)',
        due: t.due,
        notes: t.notes,
        url: t.selfLink ?? '',
      }))

      tasks.sort((a, b) => {
        if (!a.due && !b.due) return 0
        if (!a.due) return 1
        if (!b.due) return -1
        return a.due.localeCompare(b.due)
      })
    } catch {
      // tasks fetch failed silently — show events only
    }
  }

  return { authorized: true, days, tasks }
})
