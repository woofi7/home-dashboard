import type { WidgetDefinition } from './types'

export default {
  name: 'Radarr',
  authType: 'query',
  fields: [
    { label: 'Movies', desc: 'Total movies' },
    { label: 'Downloaded', desc: 'Movies with files' },
    { label: 'Queued', desc: 'Download queue' },
    { label: 'Missing', desc: 'Missing monitored movies' },
  ],
} satisfies WidgetDefinition
