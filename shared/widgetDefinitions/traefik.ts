import type { WidgetDefinition } from './types'

export default {
  name: 'Traefik',
  authType: 'basic',
  fields: [
    { label: 'Routers', desc: 'HTTP routers' },
    { label: 'Services', desc: 'HTTP services' },
    { label: 'Middlewares', desc: 'HTTP middlewares' },
  ],
} satisfies WidgetDefinition
