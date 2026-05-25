import type { WidgetDefinition } from './types'

export default {
  name: 'Uptime Kuma',
  authType: 'basic',
  fields: [
    { label: 'Monitors', desc: 'Total monitors' },
    { label: 'Up',       desc: 'Monitors currently up' },
    { label: 'Down',     desc: 'Monitors currently down' },
    { label: 'Paused',   desc: 'Paused monitors' },
    { label: 'Uptime',   desc: 'Average 24 h uptime across all monitors' },
    { label: 'Last Down', desc: 'Name of the most recently downed monitor' },
  ],
} satisfies WidgetDefinition
