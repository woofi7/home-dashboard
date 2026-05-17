import type { WidgetDefinition } from './types'

export default {
  name: 'Home Assistant',
  authType: 'bearer',
  fields: [
    { label: 'Entities', desc: 'Total entities' },
    { label: 'Automations', desc: 'Automations' },
    { label: 'Lights', desc: 'Light entities' },
    { label: 'Switches', desc: 'Switch entities' },
    { label: 'Sensors', desc: 'Sensor count' },
    { label: 'Climate', desc: 'Climate entities' },
    { label: 'Media players', desc: 'Media player entities' },
    { label: 'Scenes', desc: 'Scene count' },
  ],
} satisfies WidgetDefinition
