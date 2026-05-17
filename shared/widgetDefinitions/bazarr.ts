import type { WidgetDefinition } from './types'

export default {
  name: 'Bazarr',
  authType: 'header',
  fields: [
    { label: 'Missing episodes', desc: 'Episodes missing subtitles' },
    { label: 'Missing movies', desc: 'Movies missing subtitles' },
    { label: 'Providers', desc: 'Active subtitle providers' },
  ],
} satisfies WidgetDefinition
