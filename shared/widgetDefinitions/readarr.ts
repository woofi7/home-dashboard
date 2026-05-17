import type { WidgetDefinition } from './types'

export default {
  name: 'Readarr',
  authType: 'query',
  fields: [
    { label: 'Books', desc: 'Total books' },
    { label: 'Missing', desc: 'Missing books' },
    { label: 'Authors', desc: 'Author count' },
    { label: 'Queue', desc: 'Download queue' },
  ],
} satisfies WidgetDefinition
