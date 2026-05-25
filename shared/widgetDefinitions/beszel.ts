import type { WidgetDefinition } from './types'

export default {
  name: 'Beszel',
  authType: 'basic',
  fields: [
    { label: 'Systems', desc: 'Total monitored systems' },
    { label: 'Up',      desc: 'Systems reporting as up' },
    { label: 'Down',    desc: 'Systems reporting as down or unreachable' },
    { label: 'Avg CPU', desc: 'Average CPU usage across all systems' },
    { label: 'Avg Mem', desc: 'Average memory usage across all systems' },
  ],
} satisfies WidgetDefinition
