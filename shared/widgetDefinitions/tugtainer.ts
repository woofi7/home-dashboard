import type { WidgetDefinition } from './types'

export default {
  name: 'Tugtainer',
  authType: 'password',
  fields: [
    { label: 'Updates available', desc: 'Containers with an available update (per host)' },
    { label: 'Total containers',  desc: 'Total containers across all hosts' },
    { label: 'Unused images',     desc: 'Unused images across all hosts' },
    { label: 'Dangling images',   desc: 'Dangling images across all hosts' },
  ],
} satisfies WidgetDefinition
