import type { WidgetDefinition } from './types'

export default {
  name: 'Sonarr',
  authType: 'query',
  fields: [
    { label: 'Series', desc: 'Series count' },
    { label: 'Monitored', desc: 'Monitored series' },
    { label: 'Queued', desc: 'Download queue' },
    { label: 'Wanted', desc: 'Missing episodes' },
    { label: 'Cutoff unmet', desc: 'Cutoff unmet episodes' },
  ],
} satisfies WidgetDefinition
