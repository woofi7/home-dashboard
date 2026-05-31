import { loadConfig } from '../utils/config'
import { getGoogleCreds, getGoogleAccessToken, clearGoogleToken } from '../utils/googleToken'

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
type CalTask  = { id: string; listId: string; title: string; due?: string; notes?: string; url: string }
type CalDay   = { label: string; date: string; timed: CalEvent[]; allDay: CalEvent[] }

function dayLabel(offset: number, date: Date): string {
  if (offset === 0)
    return 'Today'
  if (offset === 1)
    return 'Tomorrow'
  return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
}

function describeTasksError(err: unknown): string {
  const gErr = (err as { data?: { error?: { message?: string; status?: string; errors?: { reason?: string }[] } } })?.data?.error
  const reason = gErr?.errors?.[0]?.reason
  if (reason === 'accessNotConfigured')
    return 'The Google Tasks API is not enabled for your Google Cloud project. Open the Cloud Console, enable the Tasks API, then reload.'
  if (gErr?.status === 'PERMISSION_DENIED' || reason === 'insufficientPermissions' || /scope/i.test(gErr?.message ?? ''))
    return 'Missing Tasks permission. Disconnect and reconnect your Google account to grant access to Tasks.'
  if (gErr?.message)
    return `Could not load Google Tasks: ${gErr.message}`
  return 'Could not load Google Tasks.'
}

function pad(n: number) { return String(n).padStart(2, '0') }

function dateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default defineEventHandler(async () => {
  const settings = loadConfig<Record<string, unknown>>('settings.yaml')
  const g = (settings?.google ?? {}) as Record<string, unknown>
  const cal = (g.calendar ?? {}) as Record<string, unknown>

  const creds = getGoogleCreds()
  if (!creds)
    return { authorized: false, days: [], tasks: [], tasksError: null }

  const showEvents = (cal.showEvents as boolean) ?? true
  const showTasks  = (cal.showTasks  as boolean) ?? false
  const daysAhead  = Math.max(1, Math.min(30, Number(cal.daysAhead) || 2))
  const taskMode   = (cal.taskMode as string) === 'overdue' ? 'overdue' : 'all'

  let accessToken: string
  try {
    accessToken = await getGoogleAccessToken(creds)
  } catch {
    clearGoogleToken()
    return { authorized: false, days: [], tasks: [], tasksError: null }
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
  let tasksError: string | null = null

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
      clearGoogleToken()
    }
  }

  if (showTasks) {
    try {
      // Both modes include every past-due incomplete task (no lower bound).
      // overdue: caps at the end of today (today + all earlier).
      // all:     caps at the end of the days-ahead window (past-due + upcoming).
      const startOfTomorrow = new Date(startOfToday)
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
      const endOfRange = new Date(startOfToday)
      endOfRange.setDate(endOfRange.getDate() + daysAhead)

      const params = new URLSearchParams({ showCompleted: 'false' })
      params.set('dueMax', (taskMode === 'overdue' ? startOfTomorrow : endOfRange).toISOString())

      type GTaskList = { id: string }
      type GTask = { id: string; title?: string; due?: string; notes?: string; webViewLink?: string; status?: string }

      const listsRes = await $fetch<{ items?: GTaskList[] }>('https://www.googleapis.com/tasks/v1/users/@me/lists', { headers })
      const lists = listsRes.items ?? []

      const allTaskArrays = await Promise.all(lists.map(async (list) => {
        const res = await $fetch<{ items?: GTask[] }>(
          `https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks?${params.toString()}`,
          { headers }
        )
        return (res.items ?? []).filter(t => t.status !== 'completed').map(t => ({ ...t, listId: list.id }))
      }))

      tasks = allTaskArrays.flat().map(t => ({
        id: t.id,
        listId: t.listId,
        title: t.title ?? '(no title)',
        due: t.due,
        notes: t.notes,
        url: t.webViewLink ?? '',
      }))

      tasks.sort((a, b) => {
        if (!a.due && !b.due) return 0
        if (!a.due) return 1
        if (!b.due) return -1
        return a.due.localeCompare(b.due)
      })
    } catch (err: unknown) {
      tasksError = describeTasksError(err)
    }
  }

  return { authorized: true, days, tasks, tasksError }
})
