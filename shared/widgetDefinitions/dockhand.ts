import type { WidgetDefinition } from './types'

export default {
  name: 'Dockhand',
  authType: 'basic',
  fields: [
    { label: 'Running',         desc: 'Running containers across all environments' },
    { label: 'Stopped',         desc: 'Stopped / exited containers across all environments' },
    { label: 'Unhealthy',       desc: 'Containers with a failing health check' },
    { label: 'Pending Updates', desc: 'Containers with a newer image available' },
    { label: 'Total',           desc: 'Total containers across all environments' },
  ],
} satisfies WidgetDefinition
