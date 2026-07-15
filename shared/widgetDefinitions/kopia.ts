import type { WidgetDefinition } from './types'

export default {
  name: 'Kopia',
  authType: 'basic',
  fields: [
    { label: 'Last backup', desc: 'Most recent snapshot date & status' },
    { label: 'Sources',     desc: 'Total configured snapshot sources' },
    { label: 'Active',      desc: 'Currently running tasks' },
    { label: 'Size',        desc: 'Total size of the latest snapshots' },
    { label: 'Errors',      desc: 'Sources with errors in their latest snapshot' },
  ],
} satisfies WidgetDefinition
