import type { WidgetDefinition } from './types'

export default {
  name: 'Restic',
  authType: 'none',
  fields: [
    { label: 'Snapshots',   desc: 'Total number of snapshots' },
    { label: 'Last Backup', desc: 'Date and time of the most recent snapshot' },
    { label: 'Age',         desc: 'How long ago the last snapshot was taken' },
    { label: 'Hostname',    desc: 'Hostname of the most recent snapshot' },
    { label: 'Paths',       desc: 'Paths included in the most recent snapshot' },
  ],
} satisfies WidgetDefinition
