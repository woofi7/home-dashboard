import type { WidgetDefinition } from './types'

export default {
  name: 'Tdarr',
  authType: 'none',
  fields: [
    { label: 'Files', desc: 'Total files processed' },
    { label: 'Done', desc: 'Completed files' },
    { label: 'Score', desc: 'Tdarr score %' },
  ],
} satisfies WidgetDefinition
