import type { WidgetDefinition } from './types'

export default {
  name: 'ArchiSteamFarm',
  authType: 'password',
  fields: [
    { label: 'Bots',    desc: 'Total configured bots' },
    { label: 'Online',  desc: 'Bots connected and logged in' },
    { label: 'Farming', desc: 'Bots actively farming cards' },
    { label: 'Cards',   desc: 'Total cards remaining across all farming bots' },
    { label: 'Games',   desc: 'Total games remaining across all farming bots' },
  ],
} satisfies WidgetDefinition
