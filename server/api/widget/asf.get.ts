import { widgetEndpoint } from '../../utils/widgetError'
import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'

import definition from '#shared/widgetDefinitions/asf'
export const meta = definition

type BotCard = { Farming: boolean; GamesRemaining: number; CardsRemaining: number }
type Bot = { IsConnectedAndLoggedOn: boolean; CardsFarmer: BotCard }
type BotsResult = { Result: Record<string, Bot> }

export async function fetchAsf(creds: ServiceCredentials) {
  const { url, password } = creds
  if (!url || !password)
    return null

  const base = url.replace(/\/$/, '')
  const headers = { Authentication: password }

  const res = await $fetch<BotsResult>(`${base}/Api/Bot/ASF`, { headers })
  const bots = Object.values(res.Result ?? {})

  const online  = bots.filter(b => b.IsConnectedAndLoggedOn).length
  const farming = bots.filter(b => b.CardsFarmer?.Farming).length
  const cards   = bots.reduce((s, b) => s + (b.CardsFarmer?.CardsRemaining ?? 0), 0)
  const games   = bots.reduce((s, b) => s + (b.CardsFarmer?.GamesRemaining ?? 0), 0)

  const allFields = [
    { label: 'Bots',    value: bots.length },
    { label: 'Online',  value: online },
    { label: 'Farming', value: farming },
    { label: 'Cards',   value: cards },
    { label: 'Games',   value: games },
  ]

  return { type: 'asf', fields: getOrderedActiveFields('asf', allFields) }
}

export { fetchAsf as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchAsf, ['url', 'password']))
