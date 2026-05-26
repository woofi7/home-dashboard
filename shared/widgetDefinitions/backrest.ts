import type { WidgetDefinition } from './types'

export default {
  name: 'Backrest',
  authType: 'password',
  fields: [
    { label: 'Last backup', desc: 'Time since the most recent backup (per repo)' },
    { label: 'Snapshots',   desc: 'Total snapshot count from most recent stats run' },
    { label: 'Disk size',   desc: 'Total deduplicated repo size from most recent stats run' },
  ],
} satisfies WidgetDefinition
