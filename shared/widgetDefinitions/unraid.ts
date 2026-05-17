import type { WidgetDefinition } from './types'

export default {
  name: 'Unraid',
  authType: 'header',
  fields: [
    { label: 'Array', desc: 'Array state (Started / Stopped)' },
    { label: 'Used', desc: 'Storage used / total' },
    { label: 'Disks', desc: 'Disk slots used / total' },
    { label: 'Parity', desc: 'Last parity check status & progress' },
    { label: 'CPU', desc: 'CPU usage %' },
    { label: 'Memory', desc: 'RAM used / total' },
  ],
} satisfies WidgetDefinition
