import type { WidgetDefinition } from './types'

export default {
  name: 'Prowlarr',
  authType: 'query',
  fields: [
    { label: 'Indexers', desc: 'Total indexers' },
    { label: 'Grabs', desc: 'Total grabs' },
    { label: 'Queries', desc: 'Total queries' },
    { label: 'Failures', desc: 'Failed queries' },
  ],
} satisfies WidgetDefinition
