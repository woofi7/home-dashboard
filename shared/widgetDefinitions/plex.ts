import type { WidgetDefinition } from './types'

export default {
  name: 'Plex',
  authType: 'query',
  fields: [
    { label: 'Movies', desc: 'Movie library count' },
    { label: 'Shows', desc: 'TV show library count' },
    { label: 'Streams', desc: 'Active streams' },
  ],
} satisfies WidgetDefinition
