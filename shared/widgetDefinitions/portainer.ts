import type { WidgetDefinition } from './types'

export default {
  name: 'Portainer',
  authType: 'bearer',
  fields: [
    { label: 'Running', desc: 'Running containers' },
    { label: 'Stopped', desc: 'Stopped / exited containers' },
    { label: 'Containers', desc: 'Total containers' },
    { label: 'Stacks', desc: 'Stack count' },
    { label: 'Volumes', desc: 'Volume count' },
    { label: 'Images', desc: 'Image count' },
  ],
} satisfies WidgetDefinition
