import type { WidgetDefinition } from './types'

export default {
  name: 'Audiobookshelf',
  authType: 'bearer',
  fields: [
    { label: 'Audiobooks', desc: 'Total audiobooks across all book libraries' },
    { label: 'Authors', desc: 'Total unique authors' },
    { label: 'Duration', desc: 'Total listening duration' },
    { label: 'Size', desc: 'Total library size' },
  ],
} satisfies WidgetDefinition
