import type { WidgetDefinition } from './types'

export default {
  name: 'Duplicati',
  authType: 'password',
  fields: [
    { label: 'Last backup', desc: 'Most recent backup date & status' },
    { label: 'Jobs', desc: 'Total backup jobs' },
    { label: 'Active', desc: 'Active tasks' },
    { label: 'Source', desc: 'Total source size' },
    { label: 'Dest', desc: 'Total destination size' },
  ],
} satisfies WidgetDefinition
