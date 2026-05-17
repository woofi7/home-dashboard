import { loadConfig } from '../utils/config'
import { createCache } from '../utils/cache'

type CalEvent = { id: string; summary: string; start: string; end: string; allDay: boolean; location?: string; url: string }

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

export default defineEventHandler(async () => {
  const settings = loadConfig<Record<string, unknown>>('settings.yaml')
  const g = settings?.google as Record<string, string> | undefined

  const { clientId, clientSecret, refreshToken } = g ?? {}
  if (!clientId || !clientSecret || !refreshToken)
    return { authorized: false, todayTimed: [], todayAllDay: [], tomorrow: [] }

  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken)

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString()

  const res = await $fetch<{ items: Array<{ id: string; summary?: string; htmlLink?: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; location?: string }> }>(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfToday}&timeMax=${endOfTomorrow}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`

  const toEvent = (e: typeof res.items[0]): CalEvent => ({
    id: e.id,
    summary: e.summary ?? '(no title)',
    start: e.start.dateTime ?? e.start.date ?? '',
    end: e.end.dateTime ?? e.end.date ?? '',
    allDay: !e.start.dateTime,
    location: e.location,
    url: e.htmlLink ?? '',
  })

  const belongsTo = (e: typeof res.items[0], day: string) => {
    const d = e.start.dateTime ? e.start.dateTime.slice(0, 10) : e.start.date ?? ''
    return d === day
  }

  return {
    authorized: true,
    todayTimed: res.items.filter(e => belongsTo(e, todayStr) && !!e.start.dateTime).map(toEvent),
    todayAllDay: res.items.filter(e => belongsTo(e, todayStr) && !e.start.dateTime).map(toEvent),
    tomorrow: res.items.filter(e => belongsTo(e, tomorrowStr)).map(toEvent),
  }
})
